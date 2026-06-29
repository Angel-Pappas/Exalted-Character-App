-- Adds prerequisite_ability/prerequisite_essence columns to charm_library and a new
-- charm_modes table (per-Exalt-type variant text, Upgrades, Repurchase notes), then
-- backfills both from the existing description text. Already applied via Supabase
-- MCP; kept here for the record.

alter table public.charm_library add column if not exists prerequisite_ability text;
alter table public.charm_library add column if not exists prerequisite_essence integer;

create table public.charm_modes (
  id uuid primary key default gen_random_uuid(),
  charm_id uuid not null references public.charm_library(id) on delete cascade,
  label text not null,
  mode_text text
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

-- Backfill: the "Prerequisite:" / "Prerequisites:" line in the description text is
-- stored verbatim (e.g. "Force 5, Essence 3", "Physique 3 or Navigate 3"). If no
-- explicit Essence number appears in that line, prerequisite_essence defaults to 1.
with prereq as (
  select id, (regexp_match(description, 'Prerequisites?:\s*([^\n]+)'))[1] as line
  from public.charm_library
)
update public.charm_library cl
set prerequisite_ability = nullif(trim(p.line), 'None'),
    prerequisite_essence = coalesce((regexp_match(p.line, 'Essence\s*(\d+)'))[1]::int, 1)
from prereq p
where p.id = cl.id;

-- Backfill: per-Exalt-type variant blocks in the description look like
-- "\n\n[Label] text...". Each becomes one charm_modes row.
insert into public.charm_modes (charm_id, label, mode_text)
select
  cl.id,
  trim(split_part(block, ']', 1)) as label,
  trim(substring(block from position(']' in block) + 1)) as mode_text
from public.charm_library cl
cross join lateral unnest(
  (regexp_split_to_array(cl.description, E'\n\n\\['))[2:]
) as block
where array_length(regexp_split_to_array(cl.description, E'\n\n\\['), 1) > 1;
