-- Adds structured prerequisites to charm_modes (Upgrades/Repurchases that state
-- an ability and/or Essence requirement, e.g. "Living Wind Approach (Upgrade,
-- Athletics 5, Essence 3): ..."). Exalt-type modes (Solar, Lunar, etc.) were left
-- alone: their "At Essence N, ..." phrasing is a scaling threshold within the
-- effect, not a purchase gate, so it isn't the same kind of prerequisite.

alter table public.charm_modes add column if not exists prerequisite_essence integer;

create table public.charm_mode_prerequisite_abilities (
  id uuid primary key default gen_random_uuid(),
  mode_id uuid not null references public.charm_modes(id) on delete cascade,
  text text not null
);
alter table public.charm_mode_prerequisite_abilities enable row level security;
create policy "Anyone can read charm mode prerequisite abilities" on public.charm_mode_prerequisite_abilities for select using (true);
create policy "Admins can insert charm mode prerequisite abilities" on public.charm_mode_prerequisite_abilities for insert
  with check (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));
create policy "Admins can update charm mode prerequisite abilities" on public.charm_mode_prerequisite_abilities for update
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));
create policy "Admins can delete charm mode prerequisite abilities" on public.charm_mode_prerequisite_abilities for delete
  using (exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin'));

-- Backfill: hand-parsed from each mode's leading "(Upgrade/Repurchase, Ability N, Essence M)"
-- parenthetical. "X or Y N" alternatives are expanded into separate ability rows
-- (e.g. "Embassy or Performance 5" -> "Embassy 5" + "Performance 5"), mirroring the
-- charm_prerequisite_abilities multi-row-per-alternative pattern.

update public.charm_modes set prerequisite_essence = 2 where id in (
  'ddcf099d-4cb1-48ef-9b1c-8ae3592b07f1','a6a8af75-0691-449b-ac20-616b8ac19030',
  '45ef95c3-d634-483e-b892-08538c698a46','39b4df63-18fb-4a96-b119-07ccfef6e322',
  'a05301cd-768d-4732-b3bc-0e239276e542','ba9737f3-fa77-41f4-8a16-345ea898caa5',
  '9fb57cd1-5f48-4e79-b038-0dba5a2ea3d5','c4b988d9-199c-4f7b-b0f4-b455f44f1fc5',
  'bab52915-86bd-477d-ab93-f66546d89fcb','04d9c5e9-9472-4143-8403-32c32ee4a8c9',
  '11009a59-4de2-44dd-a05a-abaf14e0bc3a','d4cbfe14-9b3d-4056-a089-7993ac2512d8',
  '2faf79bf-d19a-4288-9fd6-01a19a9b4bfa','9bc225ec-5eeb-4077-a220-94e522840a5f'
);

update public.charm_modes set prerequisite_essence = 3 where id in (
  'b597225a-6364-4054-93b6-6c0faa1da906','795ca66f-73df-4201-9e5f-ce2b4a4236f0',
  '5d6ec98b-1e08-4472-9664-6cfcdd840210','2b25b3f3-bf9c-434d-8844-4fb63bc74c07',
  '0122642a-5b08-4b59-8960-e1b39a75c831','6e8e88ba-2dc0-4515-b36e-7c53485d21bb',
  '6547abd0-2960-45f3-acac-bf88ae8ed581','974d07ae-322b-4922-8062-953e90ddd5e0',
  'efb90502-3d0a-4cb0-b200-6f387ac06199','70f92641-29ed-4949-9ce4-82d7b8950759',
  '527594bd-a31f-44d6-8a02-5c728b8f60bd','bd24487a-aa9a-4bdf-943c-5bd4147d12d2',
  '03b09d73-ae64-4568-ba4b-b6f121df9317','43183b6f-0a5f-4f71-9d03-4a43272d6ecb',
  '46f6b81d-d783-4100-aeed-85b32a91b3ea','0c119796-5a70-401f-b8e7-d947ca910d23'
);

update public.charm_modes set prerequisite_essence = 4 where id in (
  '9162c339-32ec-41ce-99d6-748032f2d45c','52ccee38-c9e5-4380-9bc1-b27d7a515df0',
  '3062f54c-0926-4c09-9937-d0744f5a3684'
);

update public.charm_modes set prerequisite_essence = 5 where id in (
  '74622d81-fde7-4e98-97b3-f26498d4fb03','b2035d33-a8ae-4cc3-8954-19f106bc1964',
  '64cce763-4052-4c74-b99c-ace3cd484910'
);

insert into public.charm_mode_prerequisite_abilities (mode_id, text) values
  ('8fe3e3ba-9c04-4180-a040-72d913ad32cf','Finesse 3'),
  ('692865aa-f0d7-486e-bf60-e4c5071a7892','Ranged Combat 4'),
  ('e6d14c73-ca6f-4a6c-aa97-0f64626de236','Awareness 4'),
  ('5a7bdb80-0305-4491-8798-988459a33d2e','Awareness 4'),
  ('cd47bee2-7553-4744-9c57-bd8df1f3976d','Awareness 4'),
  ('46f6b81d-d783-4100-aeed-85b32a91b3ea','Sagacity 3'),
  ('0c119796-5a70-401f-b8e7-d947ca910d23','Sagacity 3'),
  ('b2035d33-a8ae-4cc3-8954-19f106bc1964','Sagacity 5'),
  ('64cce763-4052-4c74-b99c-ace3cd484910','Sagacity 5'),
  ('86d7b25d-6a8f-4e50-a813-f00570431d5d','Athletics 3'),
  ('45ef95c3-d634-483e-b892-08538c698a46','Athletics 4'),
  ('39b4df63-18fb-4a96-b119-07ccfef6e322','Athletics 4'),
  ('b597225a-6364-4054-93b6-6c0faa1da906','Athletics 5'),
  ('795ca66f-73df-4201-9e5f-ce2b4a4236f0','Athletics 5'),
  ('73013a7e-5bd7-4b11-9123-22166c6e4a3d','Embassy 4'),
  ('04edc32a-3067-46f1-8b79-ec498d797be7','Embassy 4'),
  ('04edc32a-3067-46f1-8b79-ec498d797be7','Integrity 4'),
  ('5d6ec98b-1e08-4472-9664-6cfcdd840210','Embassy 5'),
  ('5d6ec98b-1e08-4472-9664-6cfcdd840210','Performance 5'),
  ('5d07508f-e555-412a-80d2-c8b4d67e410c','Embassy 5'),
  ('5d07508f-e555-412a-80d2-c8b4d67e410c','Presence 5'),
  ('04d9c5e9-9472-4143-8403-32c32ee4a8c9','Integrity 4'),
  ('70f92641-29ed-4949-9ce4-82d7b8950759','Navigate 5'),
  ('987a330a-f5a5-4ec3-a4c1-3f77e1295465','Performance 4'),
  ('11009a59-4de2-44dd-a05a-abaf14e0bc3a','Physique 5'),
  ('527594bd-a31f-44d6-8a02-5c728b8f60bd','Presence 5'),
  ('d4cbfe14-9b3d-4056-a089-7993ac2512d8','Sagacity 3'),
  ('dc9dda97-3241-4aab-b7ad-428696696483','Sagacity 4'),
  ('1d9ff678-5655-484c-a749-13a959d3ed2a','Sagacity 4'),
  ('8430abb9-a586-4e7b-932a-0829853b42f2','Sagacity 4'),
  ('2faf79bf-d19a-4288-9fd6-01a19a9b4bfa','Sagacity 4'),
  ('bd24487a-aa9a-4bdf-943c-5bd4147d12d2','Sagacity 5'),
  ('01518382-7965-4a6f-b682-06d242c922a7','War 5'),
  ('03b09d73-ae64-4568-ba4b-b6f121df9317','War 5'),
  ('9bc225ec-5eeb-4077-a220-94e522840a5f','Awareness 5');
