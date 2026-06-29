-- Catalogues "At Essence N, ..." scaling clauses found embedded in charm
-- descriptions and exalt-type mode text — e.g. Arrow Storm Attack's main
-- body ("At Essence 3, the bonus damage becomes successes on Step 7,
-- instead") or Loyal Guardian Approach's Janest mode ("At Essence 2, she
-- may apply this Charm to any number of targets within close range").
--
-- These are NOT purchase prerequisites (see migration_charm_mode_
-- prerequisites.sql for those) — the charm/mode is usable regardless of
-- Essence, these clauses just describe when an extra benefit kicks in.
-- Source text is left completely unchanged; this is purely additive
-- cataloguing for future character-sheet logic to reference.

create table charm_essence_tiers (
  id uuid primary key default gen_random_uuid(),
  charm_id uuid references charm_library(id) on delete cascade,
  mode_id uuid references charm_modes(id) on delete cascade,
  essence_threshold integer not null,
  effect_text text not null,
  check ((charm_id is not null) <> (mode_id is not null))
);
alter table charm_essence_tiers enable row level security;
create policy "Anyone can read charm essence tiers" on charm_essence_tiers for select using (true);
create policy "Admins can insert charm essence tiers" on charm_essence_tiers for insert
  with check (exists (select 1 from user_profiles where user_id = auth.uid() and role = 'admin'));
create policy "Admins can update charm essence tiers" on charm_essence_tiers for update
  using (exists (select 1 from user_profiles where user_id = auth.uid() and role = 'admin'));
create policy "Admins can delete charm essence tiers" on charm_essence_tiers for delete
  using (exists (select 1 from user_profiles where user_id = auth.uid() and role = 'admin'));

-- Backfilled 28 rows across 21 charms, hand-read and verified against the
-- source text (see conversation for the full audit). Two genuinely
-- two-threshold charms (Quickening the Forge's Solar mode, Undying Body)
-- get two rows each, same effect_text, different essence_threshold.
-- (Literal INSERT statements omitted here since they target this
-- database's generated UUIDs — see conversation for the exact values.)
