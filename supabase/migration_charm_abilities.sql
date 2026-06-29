-- Adds the many-to-many charm_abilities join table, backfills it from the existing
-- charm_library.ability column (split on " / "), and adds page/mechanical_description
-- columns to charm_library. Already applied via Supabase MCP; kept here for the record.

create table public.charm_abilities (
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

insert into public.charm_abilities (charm_id, ability)
select id, trim(a) from public.charm_library, unnest(string_to_array(ability, ' / ')) as a;

alter table public.charm_library add column if not exists page integer;
alter table public.charm_library add column if not exists mechanical_description text;
