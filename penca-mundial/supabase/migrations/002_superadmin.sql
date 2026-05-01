-- ============================================================
-- Migration 002: Superadmin support
-- ============================================================

-- Add is_superadmin column to profiles
alter table profiles
  add column if not exists is_superadmin boolean not null default false;

-- Update handle_new_user to auto-grant superadmin to the owner email
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _is_super boolean;
begin
  -- Auto-grant superadmin to the designated owner
  _is_super := (new.email = 'galbieni@gmail.com');

  insert into public.profiles (id, full_name, avatar_url, is_superadmin)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    _is_super
  );
  return new;
end;
$$;

-- Policy: superadmins can read ALL groups (not just their own)
create policy "groups_select_superadmin" on groups
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_superadmin = true
    )
  );

-- Policy: superadmins can read ALL group_members
create policy "group_members_select_superadmin" on group_members
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_superadmin = true
    )
  );

-- Policy: superadmins can read ALL predictions
create policy "predictions_select_superadmin" on predictions
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_superadmin = true
    )
  );

-- Policy: superadmins can insert/update teams and matches (for manual sync)
create policy "teams_insert_superadmin" on teams
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_superadmin = true
    )
  );

create policy "teams_update_superadmin" on teams
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_superadmin = true
    )
  );

create policy "matches_insert_superadmin" on matches
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_superadmin = true
    )
  );

create policy "matches_update_superadmin" on matches
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_superadmin = true
    )
  );
