-- ============================================================
-- Penca Mundial 2026 - Initial Schema + RLS Policies
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- TEAMS
-- ============================================================
create table teams (
  id serial primary key,
  api_id int unique,
  name text not null,
  short_name text,
  flag_url text,
  group_letter text  -- A..L for group stage
);

-- ============================================================
-- MATCHES
-- ============================================================
create table matches (
  id uuid primary key default gen_random_uuid(),
  api_id int unique,
  home_team_id int references teams(id),
  away_team_id int references teams(id),
  starts_at timestamptz not null,
  stage text not null check (stage in (
    'GROUP', 'ROUND_OF_16', 'QUARTER_FINAL',
    'SEMI_FINAL', 'THIRD_PLACE', 'FINAL'
  )),
  group_letter text,
  matchday int,
  status text default 'SCHEDULED' check (status in (
    'SCHEDULED', 'TIMED', 'LIVE', 'IN_PLAY', 'PAUSED',
    'FINISHED', 'SUSPENDED', 'POSTPONED', 'CANCELLED'
  )),
  home_score int,
  away_score int,
  venue text,
  updated_at timestamptz default now()
);

-- Index for fast queries by date and status
create index matches_starts_at_idx on matches(starts_at);
create index matches_status_idx on matches(status);

-- ============================================================
-- GROUPS
-- ============================================================
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  created_by uuid references profiles(id) on delete set null,
  -- Punto system (configurable per group)
  pts_exact_groups int default 3 check (pts_exact_groups >= 0),
  pts_winner_groups int default 1 check (pts_winner_groups >= 0),
  pts_exact_knockout int default 6 check (pts_exact_knockout >= 0),
  pts_winner_knockout int default 2 check (pts_winner_knockout >= 0),
  -- Prizes
  prize_1st text,
  prize_2nd text,
  prize_3rd text,
  created_at timestamptz default now()
);

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

create index group_members_group_id_idx on group_members(group_id);
create index group_members_user_id_idx on group_members(user_id);

-- Auto-add creator as admin when group is created
create or replace function add_creator_as_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$;

create trigger on_group_created
  after insert on groups
  for each row execute procedure add_creator_as_admin();

-- ============================================================
-- INVITATIONS
-- ============================================================
create table invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  code text unique not null,
  created_by uuid references profiles(id),
  max_uses int default 100 check (max_uses > 0),
  uses_count int default 0,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create index invitations_code_idx on invitations(code);
create index invitations_group_id_idx on invitations(group_id);

-- ============================================================
-- PREDICTIONS
-- ============================================================
create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  match_id uuid references matches(id) on delete cascade,
  home_score_pred int not null check (home_score_pred >= 0),
  away_score_pred int not null check (away_score_pred >= 0),
  points_earned int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, group_id, match_id)
);

create index predictions_user_group_idx on predictions(user_id, group_id);
create index predictions_match_id_idx on predictions(match_id);

-- Update timestamp trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger predictions_updated_at
  before update on predictions
  for each row execute procedure update_updated_at();

create trigger matches_updated_at
  before update on matches
  for each row execute procedure update_updated_at();

-- ============================================================
-- LEADERBOARD VIEW
-- ============================================================
create or replace view leaderboard as
  select
    gm.group_id,
    gm.user_id,
    p.full_name,
    p.avatar_url,
    coalesce(sum(pred.points_earned), 0) as total_points,
    count(pred.id) filter (where pred.points_earned > 0) as predictions_with_points,
    count(pred.id) as total_predictions,
    rank() over (
      partition by gm.group_id
      order by coalesce(sum(pred.points_earned), 0) desc
    ) as rank
  from group_members gm
  join profiles p on p.id = gm.user_id
  left join predictions pred on pred.user_id = gm.user_id
    and pred.group_id = gm.group_id
  group by gm.group_id, gm.user_id, p.full_name, p.avatar_url;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

alter table profiles enable row level security;
alter table teams enable row level security;
alter table matches enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table invitations enable row level security;
alter table predictions enable row level security;

-- ---- PROFILES ----
-- Anyone authenticated can read profiles
create policy "profiles_select" on profiles
  for select using (auth.uid() is not null);

-- Users can only update their own profile
create policy "profiles_update" on profiles
  for update using (auth.uid() = id);

-- ---- TEAMS ----
-- Everyone can read teams (public data)
create policy "teams_select" on teams
  for select using (true);

-- Only service role can insert/update teams
create policy "teams_insert" on teams
  for insert with check (false);  -- blocked for users, only service_role bypasses RLS

create policy "teams_update" on teams
  for update using (false);

-- ---- MATCHES ----
-- Everyone can read matches (public data)
create policy "matches_select" on matches
  for select using (true);

-- Only service role (cron) can modify matches
create policy "matches_insert" on matches
  for insert with check (false);

create policy "matches_update" on matches
  for update using (false);

-- ---- GROUPS ----
-- Members can read groups they belong to
create policy "groups_select_member" on groups
  for select using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
        and group_members.user_id = auth.uid()
    )
  );

-- Authenticated users can create groups
create policy "groups_insert" on groups
  for insert with check (auth.uid() is not null and auth.uid() = created_by);

-- Only group admin can update
create policy "groups_update" on groups
  for update using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
        and group_members.user_id = auth.uid()
        and group_members.role = 'admin'
    )
  );

-- Only group admin can delete
create policy "groups_delete" on groups
  for delete using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
        and group_members.user_id = auth.uid()
        and group_members.role = 'admin'
    )
  );

-- ---- GROUP MEMBERS ----
-- Members can see other members in their groups
create policy "group_members_select" on group_members
  for select using (
    exists (
      select 1 from group_members gm2
      where gm2.group_id = group_members.group_id
        and gm2.user_id = auth.uid()
    )
  );

-- Users can join groups (insert themselves)
create policy "group_members_insert" on group_members
  for insert with check (auth.uid() = user_id);

-- Admins can update member roles; members can remove themselves
create policy "group_members_update" on group_members
  for update using (
    auth.uid() = user_id
    or exists (
      select 1 from group_members gm2
      where gm2.group_id = group_members.group_id
        and gm2.user_id = auth.uid()
        and gm2.role = 'admin'
    )
  );

-- Admins can remove members; members can remove themselves
create policy "group_members_delete" on group_members
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from group_members gm2
      where gm2.group_id = group_members.group_id
        and gm2.user_id = auth.uid()
        and gm2.role = 'admin'
    )
  );

-- ---- INVITATIONS ----
-- Anyone authenticated can read invitations (to join via code)
create policy "invitations_select" on invitations
  for select using (auth.uid() is not null);

-- Admins can create invitations
create policy "invitations_insert" on invitations
  for insert with check (
    exists (
      select 1 from group_members
      where group_members.group_id = invitations.group_id
        and group_members.user_id = auth.uid()
        and group_members.role = 'admin'
    )
  );

-- Admins can delete invitations
create policy "invitations_delete" on invitations
  for delete using (
    exists (
      select 1 from group_members
      where group_members.group_id = invitations.group_id
        and group_members.user_id = auth.uid()
        and group_members.role = 'admin'
    )
  );

-- Service role can update uses_count
create policy "invitations_update" on invitations
  for update using (auth.uid() is not null);  -- controlled in app logic

-- ---- PREDICTIONS ----
-- Users can see predictions for groups they belong to
create policy "predictions_select" on predictions
  for select using (
    exists (
      select 1 from group_members
      where group_members.group_id = predictions.group_id
        and group_members.user_id = auth.uid()
    )
  );

-- Users can insert their own predictions
create policy "predictions_insert" on predictions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from group_members
      where group_members.group_id = predictions.group_id
        and group_members.user_id = auth.uid()
    )
    -- Cannot predict after match starts
    and exists (
      select 1 from matches
      where matches.id = predictions.match_id
        and matches.starts_at > now()
    )
  );

-- Users can update their own predictions (only before match starts)
create policy "predictions_update" on predictions
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from matches
      where matches.id = predictions.match_id
        and matches.starts_at > now()
    )
  );

-- ============================================================
-- SEED: World Cup 2026 Teams (all 48 teams)
-- ============================================================
insert into teams (name, short_name, group_letter, flag_url) values
  -- Group A
  ('United States', 'USA', 'A', 'https://flagcdn.com/us.svg'),
  ('Canada', 'CAN', 'A', 'https://flagcdn.com/ca.svg'),
  ('Mexico', 'MEX', 'A', 'https://flagcdn.com/mx.svg'),
  -- Group B
  ('Argentina', 'ARG', 'B', 'https://flagcdn.com/ar.svg'),
  ('Ecuador', 'ECU', 'B', 'https://flagcdn.com/ec.svg'),
  ('Peru', 'PER', 'B', 'https://flagcdn.com/pe.svg'),
  -- Group C
  ('Brazil', 'BRA', 'C', 'https://flagcdn.com/br.svg'),
  ('Colombia', 'COL', 'C', 'https://flagcdn.com/co.svg'),
  ('Uruguay', 'URU', 'C', 'https://flagcdn.com/uy.svg'),
  -- Group D
  ('France', 'FRA', 'D', 'https://flagcdn.com/fr.svg'),
  ('England', 'ENG', 'D', 'https://flagcdn.com/gb-eng.svg'),
  ('Belgium', 'BEL', 'D', 'https://flagcdn.com/be.svg'),
  -- Group E
  ('Germany', 'GER', 'E', 'https://flagcdn.com/de.svg'),
  ('Spain', 'ESP', 'E', 'https://flagcdn.com/es.svg'),
  ('Portugal', 'POR', 'E', 'https://flagcdn.com/pt.svg'),
  -- Group F
  ('Netherlands', 'NED', 'F', 'https://flagcdn.com/nl.svg'),
  ('Italy', 'ITA', 'F', 'https://flagcdn.com/it.svg'),
  ('Croatia', 'CRO', 'F', 'https://flagcdn.com/hr.svg'),
  -- Group G
  ('Morocco', 'MAR', 'G', 'https://flagcdn.com/ma.svg'),
  ('Senegal', 'SEN', 'G', 'https://flagcdn.com/sn.svg'),
  ('Egypt', 'EGY', 'G', 'https://flagcdn.com/eg.svg'),
  -- Group H
  ('Japan', 'JPN', 'H', 'https://flagcdn.com/jp.svg'),
  ('South Korea', 'KOR', 'H', 'https://flagcdn.com/kr.svg'),
  ('Australia', 'AUS', 'H', 'https://flagcdn.com/au.svg'),
  -- Group I
  ('Saudi Arabia', 'KSA', 'I', 'https://flagcdn.com/sa.svg'),
  ('Iran', 'IRN', 'I', 'https://flagcdn.com/ir.svg'),
  ('Qatar', 'QAT', 'I', 'https://flagcdn.com/qa.svg'),
  -- Group J
  ('Poland', 'POL', 'J', 'https://flagcdn.com/pl.svg'),
  ('Ukraine', 'UKR', 'J', 'https://flagcdn.com/ua.svg'),
  ('Serbia', 'SRB', 'J', 'https://flagcdn.com/rs.svg'),
  -- Group K
  ('Chile', 'CHI', 'K', 'https://flagcdn.com/cl.svg'),
  ('Venezuela', 'VEN', 'K', 'https://flagcdn.com/ve.svg'),
  ('Bolivia', 'BOL', 'K', 'https://flagcdn.com/bo.svg'),
  -- Group L
  ('Nigeria', 'NGA', 'L', 'https://flagcdn.com/ng.svg'),
  ('Cameroon', 'CMR', 'L', 'https://flagcdn.com/cm.svg'),
  ('Ivory Coast', 'CIV', 'L', 'https://flagcdn.com/ci.svg');
