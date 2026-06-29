-- Splits the old single-text charm_library.prerequisite_ability column into two
-- proper many-to-many tables: charm_prerequisite_abilities (multiple alternative
-- ability prerequisites, e.g. "Integrity 2" / "Presence 3") and
-- charm_prerequisite_charms (other charms required as prerequisites). Already
-- applied via Supabase MCP; kept here for the record.

create table public.charm_prerequisite_abilities (
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

create table public.charm_prerequisite_charms (
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

-- Backfill: split the raw prerequisite_ability line on commas and " or ", strip a
-- leading "or" left over from Oxford-comma lists and any trailing period, drop
-- bare "Essence N" tokens (already captured in prerequisite_essence), abbreviate
-- "Complementary/Complimentary Ability/Abilities (Total)" to "C.A.T", and route
-- each remaining token to the abilities table if it ends in a number, or the
-- charms table otherwise.
with toks0 as (
  select cl.id as charm_id, trim(t) as tok0
  from public.charm_library cl, unnest(regexp_split_to_array(cl.prerequisite_ability, '\s*,\s*|\s+or\s+')) as t
  where cl.prerequisite_ability is not null
),
toks as (
  select charm_id,
    trim(regexp_replace(regexp_replace(tok0, '^or\s+', '', 'i'), '\.\s*$', '')) as tok
  from toks0
)
insert into public.charm_prerequisite_abilities (charm_id, text)
select charm_id,
  regexp_replace(tok, 'compl[ei]mentary\s+abilit(y|ies)(\s+total)?', 'C.A.T', 'i')
from toks
where tok <> '' and tok !~* '^Essence\s*\d+$' and tok ~ '[0-9]\s*$';

with toks0 as (
  select cl.id as charm_id, trim(t) as tok0
  from public.charm_library cl, unnest(regexp_split_to_array(cl.prerequisite_ability, '\s*,\s*|\s+or\s+')) as t
  where cl.prerequisite_ability is not null
),
toks as (
  select charm_id,
    trim(regexp_replace(regexp_replace(tok0, '^or\s+', '', 'i'), '\.\s*$', '')) as tok
  from toks0
)
insert into public.charm_prerequisite_charms (charm_id, charm_name)
select charm_id, tok
from toks
where tok <> '' and tok !~* '^Essence\s*\d+$' and tok !~ '[0-9]\s*$';

-- Manual fix: "Close or Ranged Combat 5, Essence 3" (Death of All Happiness) split badly.
delete from public.charm_prerequisite_abilities where charm_id = '8a58fa2d-1308-45c2-a987-8f9ea66be033';
delete from public.charm_prerequisite_charms where charm_id = '8a58fa2d-1308-45c2-a987-8f9ea66be033';
insert into public.charm_prerequisite_abilities (charm_id, text) values
  ('8a58fa2d-1308-45c2-a987-8f9ea66be033', 'Close Combat 5'),
  ('8a58fa2d-1308-45c2-a987-8f9ea66be033', 'Ranged Combat 5');

-- Manual fix: "Essence 3, Undying Body, one other Force or Fortitude Charm."
-- (Towering Corporeal Pillar) split badly.
delete from public.charm_prerequisite_abilities where charm_id = '138e0324-1ba4-4240-897b-b5bf14ab8c04';
delete from public.charm_prerequisite_charms where charm_id = '138e0324-1ba4-4240-897b-b5bf14ab8c04';
insert into public.charm_prerequisite_charms (charm_id, charm_name) values
  ('138e0324-1ba4-4240-897b-b5bf14ab8c04', 'Undying Body'),
  ('138e0324-1ba4-4240-897b-b5bf14ab8c04', 'one other Force or Fortitude Charm');

-- charm_library.prerequisite_ability is superseded by the two tables above.
-- Already dropped via Supabase MCP; kept here for the record.
alter table public.charm_library drop column if exists prerequisite_ability;
