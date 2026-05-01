-- ============================================================
-- Migration 002: Fix infinite RLS recursion + Superadmin
-- ============================================================

-- ── 1. HELPER FUNCTIONS (security definer = bypass RLS) ────────────────────
-- These functions query group_members directly without triggering RLS,
-- breaking the infinite recursion loop.

create or replace function auth_is_group_member(p_group_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id
      and user_id = auth.uid()
  );
$$;

create or replace function auth_is_group_admin(p_group_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function auth_is_superadmin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(
    (select is_superadmin from profiles where id = auth.uid()),
    false
  );
$$;

-- ── 2. DROP ALL OLD BROKEN POLICIES ────────────────────────────────────────

drop policy if exists "groups_select_member"   on groups;
drop policy if exists "groups_update"           on groups;
drop policy if exists "groups_delete"           on groups;
drop policy if exists "group_members_select"    on group_members;
drop policy if exists "group_members_update"    on group_members;
drop policy if exists "group_members_delete"    on group_members;
drop policy if exists "invitations_insert"      on invitations;
drop policy if exists "invitations_delete"      on invitations;
drop policy if exists "predictions_select"      on predictions;

-- ── 3. ADD SUPERADMIN COLUMN ────────────────────────────────────────────────

alter table profiles
  add column if not exists is_superadmin boolean not null default false;

-- Update trigger to auto-grant superadmin to owner email
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url, is_superadmin)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    (new.email = 'galbieni@gmail.com')
  );
  return new;
end;
$$;

-- ── 4. RECREATE GROUPS POLICIES ─────────────────────────────────────────────

create policy "groups_select_member" on groups
  for select using (
    auth_is_group_member(id) or auth_is_superadmin()
  );

create policy "groups_update" on groups
  for update using (
    auth_is_group_admin(id) or auth_is_superadmin()
  );

create policy "groups_delete" on groups
  for delete using (
    auth_is_group_admin(id) or auth_is_superadmin()
  );

-- ── 5. RECREATE GROUP_MEMBERS POLICIES (no self-reference) ─────────────────

create policy "group_members_select" on group_members
  for select using (
    auth_is_group_member(group_id) or auth_is_superadmin()
  );

create policy "group_members_update" on group_members
  for update using (
    auth.uid() = user_id
    or auth_is_group_admin(group_id)
    or auth_is_superadmin()
  );

create policy "group_members_delete" on group_members
  for delete using (
    auth.uid() = user_id
    or auth_is_group_admin(group_id)
    or auth_is_superadmin()
  );

-- ── 6. RECREATE INVITATIONS POLICIES ────────────────────────────────────────

create policy "invitations_insert" on invitations
  for insert with check (
    auth_is_group_admin(group_id) or auth_is_superadmin()
  );

create policy "invitations_delete" on invitations
  for delete using (
    auth_is_group_admin(group_id) or auth_is_superadmin()
  );

-- ── 7. RECREATE PREDICTIONS POLICIES ────────────────────────────────────────

create policy "predictions_select" on predictions
  for select using (
    auth_is_group_member(group_id) or auth_is_superadmin()
  );

-- ── 8. SUPERADMIN EXTRA POLICIES (teams & matches) ──────────────────────────

drop policy if exists "teams_insert"              on teams;
drop policy if exists "teams_update"              on teams;
drop policy if exists "matches_insert"            on matches;
drop policy if exists "matches_update"            on matches;

create policy "teams_insert" on teams
  for insert with check (auth_is_superadmin());

create policy "teams_update" on teams
  for update using (auth_is_superadmin());

create policy "matches_insert" on matches
  for insert with check (auth_is_superadmin());

create policy "matches_update" on matches
  for update using (auth_is_superadmin());
