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

-- Charm library table (global, shared across all users)
create table if not exists public.charm_library (
  id uuid primary key default gen_random_uuid(),
  ability text not null default '',
  name text not null default '',
  description text not null default '',
  mechanical_key text,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.charm_library enable row level security;

-- Everyone can read
create policy "Anyone can read charm library"
  on public.charm_library for select
  using (true);

-- Only angel.y.pappas@gmail.com can write
create policy "Owner can insert charms"
  on public.charm_library for insert
  with check (auth.email() = 'angel.y.pappas@gmail.com');

create policy "Owner can update charms"
  on public.charm_library for update
  using (auth.email() = 'angel.y.pappas@gmail.com');

create policy "Owner can delete charms"
  on public.charm_library for delete
  using (auth.email() = 'angel.y.pappas@gmail.com');

create trigger charm_library_updated_at
  before update on public.charm_library
  for each row execute function public.set_updated_at();
