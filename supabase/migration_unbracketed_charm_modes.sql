-- Fixes a gap in the original charm_modes backfill: that pass only matched
-- "[Label] text" bracketed blocks. Many charms instead write their
-- Upgrade/Repurchase (and, for Liminal charms, their Nature/Aspect submodes:
-- Blood/Breath/Flesh/Marrow/Soil) as a plain trailing sentence with no
-- brackets at all, e.g. "Living Wind Approach (Upgrade, Athletics 5,
-- Essence 3): ..." or "Blood (Nature): ...". 133 such blocks across 82
-- charms were never extracted into charm_modes and were sitting undetected
-- in charm_library.description.
--
-- Audited the full library first (see conversation) to confirm the only
-- unbracketed header patterns in use are Upgrade, Repurchase, Nature, and
-- Aspect — no other surprise label types exist.
--
-- 1. Extract every such block into charm_modes, using a marker-insertion +
--    split technique (lookahead-based capture is unreliable in Postgres's
--    POSIX-style regex engine, confirmed by testing).

insert into charm_modes (charm_id, label, mode_text)
with segs as (
  select cl.id as charm_id,
    unnest(string_to_array(
      regexp_replace(cl.description, '\n([A-Za-z][^\n(]*\([^)]*\)\s*:)', E'\x01\\1', 'g'),
      E'\x01'
    )) as segment,
    generate_subscripts(string_to_array(
      regexp_replace(cl.description, '\n([A-Za-z][^\n(]*\([^)]*\)\s*:)', E'\x01\\1', 'g'),
      E'\x01'
    ), 1) as idx
  from charm_library cl
),
parsed as (
  select charm_id, segment,
    trim((regexp_match(segment, '^([A-Za-z][^\n(]*)\('))[1]) as title,
    (regexp_match(segment, '\(([^)]*)\)\s*:'))[1] as paren_content
  from segs where idx > 1
)
select
  charm_id,
  case
    when lower(title) in ('upgrade','repurchase') then initcap(title)
    when paren_content ~* '^(upgrade|repurchase)' then initcap((regexp_match(paren_content, '^([Uu]pgrade|[Rr]epurchase)'))[1])
    else title
  end as label,
  segment as mode_text
from parsed;

-- 2. Backfill prerequisite_essence and charm_mode_prerequisite_abilities for
--    the new Upgrade/Repurchase rows, same logic as migration_charm_mode_
--    prerequisites.sql. Two rows ("Essence 3 and Essence 5" on Cyclic
--    Scythe's Upgrade and Devil-Body Incarnation's Repurchase) are
--    genuinely multi-tier and were left without a single essence value —
--    that belongs in charm_essence_tiers instead. One row ("Disrupt" on
--    Soul Fire Shaper Form, "Essence + 2") has malformed/ambiguous text and
--    was left unparsed. Nature/Aspect rows (Blood/Breath/Flesh/Marrow/Soil)
--    have no stated prerequisite at all.
--
-- (See conversation for the exact statements; omitted here since they
-- target specific generated UUIDs from this database and aren't useful as
-- a literal replay script. The pattern mirrors migration_charm_mode_
-- prerequisites.sql: regex-extract the "(Label, Ability N, Essence M)"
-- parenthetical, strip the Label token, split the remainder on Essence vs.
-- ability, expanding "X or Y N" alternatives into separate ability rows.)

-- 3. Strip the now-duplicated text from charm_library.description, leaving
--    only the main charm body (the first segment of the same split).

update charm_library
set description = (string_to_array(
  regexp_replace(description, '\n([A-Za-z][^\n(]*\([^)]*\)\s*:)', E'\x01\\1', 'g'),
  E'\x01'
))[1]
where description ~ '\n[A-Za-z][^\n(]*\([^)]*\)\s*:';
