-- Characters table
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row-level security: users can only see/edit their own characters
alter table public.characters enable row level security;

create policy "Users can read own characters"
  on public.characters for select
  using (auth.uid() = user_id);

create policy "Users can insert own characters"
  on public.characters for insert
  with check (auth.uid() = user_id);

create policy "Users can update own characters"
  on public.characters for update
  using (auth.uid() = user_id);

create policy "Users can delete own characters"
  on public.characters for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger characters_updated_at
  before update on public.characters
  for each row execute function public.set_updated_at();

-- Game data table (character-independent reference tables per user)
create table if not exists public.game_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table public.game_data enable row level security;

create policy "Users can read own game data"
  on public.game_data for select
  using (auth.uid() = user_id);

create policy "Users can insert own game data"
  on public.game_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update own game data"
  on public.game_data for update
  using (auth.uid() = user_id);

create trigger game_data_updated_at
  before update on public.game_data
  for each row execute function public.set_updated_at();

-- User profiles table (role management)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('admin', 'player')),
  display_name text,
  created_at timestamptz default now()
);

alter table public.user_profiles enable row level security;

-- Anyone logged in can read all profiles
create policy "Users can read all profiles"
  on public.user_profiles for select
  using (auth.uid() is not null);

-- Users can only update their own profile
create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id);

-- Auto-create a player profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (user_id, role)
  values (new.id, 'player');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Charm library table (global, shared across all users)
create table if not exists public.charm_library (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'Universal',
  name text not null default '',
  page integer,
  description text not null default '',
  mechanical_key text,
  mechanical_description text,
  prerequisite_essence integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.charm_library enable row level security;

-- Everyone can read
create policy "Anyone can read charm library"
  on public.charm_library for select
  using (true);

-- Only angel.y.pappas@gmail.com can write
create policy "Admins can insert charms"
  on public.charm_library for insert
  with check (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can update charms"
  on public.charm_library for update
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can delete charms"
  on public.charm_library for delete
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create trigger charm_library_updated_at
  before update on public.charm_library
  for each row execute function public.set_updated_at();

-- Charm abilities join table (a charm can apply to multiple abilities)
create table if not exists public.charm_abilities (
  charm_id uuid not null references public.charm_library(id) on delete cascade,
  ability text not null,
  primary key (charm_id, ability)
);

alter table public.charm_abilities enable row level security;

create policy "Anyone can read charm abilities"
  on public.charm_abilities for select
  using (true);

create policy "Admins can insert charm abilities"
  on public.charm_abilities for insert
  with check (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can update charm abilities"
  on public.charm_abilities for update
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can delete charm abilities"
  on public.charm_abilities for delete
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

-- Charm modes table (per-Exalt-type variant text, Upgrades, Repurchase notes, etc.)
create table if not exists public.charm_modes (
  id uuid primary key default gen_random_uuid(),
  charm_id uuid not null references public.charm_library(id) on delete cascade,
  label text not null,
  mode_text text,
  prerequisite_essence integer
);

alter table public.charm_modes enable row level security;

create policy "Anyone can read charm modes"
  on public.charm_modes for select
  using (true);

create policy "Admins can insert charm modes"
  on public.charm_modes for insert
  with check (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can update charm modes"
  on public.charm_modes for update
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can delete charm modes"
  on public.charm_modes for delete
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

-- Charm mode prerequisite abilities (a mode/Upgrade/Repurchase can require multiple alternative abilities)
create table if not exists public.charm_mode_prerequisite_abilities (
  id uuid primary key default gen_random_uuid(),
  mode_id uuid not null references public.charm_modes(id) on delete cascade,
  text text not null
);

alter table public.charm_mode_prerequisite_abilities enable row level security;

create policy "Anyone can read charm mode prerequisite abilities"
  on public.charm_mode_prerequisite_abilities for select
  using (true);

create policy "Admins can insert charm mode prerequisite abilities"
  on public.charm_mode_prerequisite_abilities for insert
  with check (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can update charm mode prerequisite abilities"
  on public.charm_mode_prerequisite_abilities for update
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can delete charm mode prerequisite abilities"
  on public.charm_mode_prerequisite_abilities for delete
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

-- Charm prerequisite abilities (a charm can require multiple alternative abilities)
create table if not exists public.charm_prerequisite_abilities (
  id uuid primary key default gen_random_uuid(),
  charm_id uuid not null references public.charm_library(id) on delete cascade,
  text text not null
);

alter table public.charm_prerequisite_abilities enable row level security;

create policy "Anyone can read charm prerequisite abilities"
  on public.charm_prerequisite_abilities for select
  using (true);

create policy "Admins can insert charm prerequisite abilities"
  on public.charm_prerequisite_abilities for insert
  with check (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can update charm prerequisite abilities"
  on public.charm_prerequisite_abilities for update
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can delete charm prerequisite abilities"
  on public.charm_prerequisite_abilities for delete
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

-- Charm prerequisite charms (a charm can require other charms as prerequisites)
create table if not exists public.charm_prerequisite_charms (
  id uuid primary key default gen_random_uuid(),
  charm_id uuid not null references public.charm_library(id) on delete cascade,
  charm_name text not null
);

alter table public.charm_prerequisite_charms enable row level security;

create policy "Anyone can read charm prerequisite charms"
  on public.charm_prerequisite_charms for select
  using (true);

create policy "Admins can insert charm prerequisite charms"
  on public.charm_prerequisite_charms for insert
  with check (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can update charm prerequisite charms"
  on public.charm_prerequisite_charms for update
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can delete charm prerequisite charms"
  on public.charm_prerequisite_charms for delete
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

-- Exalt types table (global, shared across all users)
create table if not exists public.exalt_types (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  caste_label text not null default 'Caste',
  castes text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.exalt_types enable row level security;

create policy "Anyone can read exalt types"
  on public.exalt_types for select
  using (true);

create policy "Admins can insert exalt types"
  on public.exalt_types for insert
  with check (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can update exalt types"
  on public.exalt_types for update
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can delete exalt types"
  on public.exalt_types for delete
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create trigger exalt_types_updated_at
  before update on public.exalt_types
  for each row execute function public.set_updated_at();

-- Charm essence tiers ("At Essence N, ..." scaling clauses within a charm's
-- or mode's effect text — not a purchase prerequisite, just a documented
-- threshold for when an extra benefit applies)
create table if not exists public.charm_essence_tiers (
  id uuid primary key default gen_random_uuid(),
  charm_id uuid references public.charm_library(id) on delete cascade,
  mode_id uuid references public.charm_modes(id) on delete cascade,
  essence_threshold integer not null,
  effect_text text not null,
  check ((charm_id is not null) <> (mode_id is not null))
);

alter table public.charm_essence_tiers enable row level security;

create policy "Anyone can read charm essence tiers"
  on public.charm_essence_tiers for select
  using (true);

create policy "Admins can insert charm essence tiers"
  on public.charm_essence_tiers for insert
  with check (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can update charm essence tiers"
  on public.charm_essence_tiers for update
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

create policy "Admins can delete charm essence tiers"
  on public.charm_essence_tiers for delete
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));
