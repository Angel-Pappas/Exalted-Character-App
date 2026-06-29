-- charm_library.description previously still contained the raw text that had
-- already been extracted into relational columns/tables:
--   - the "(Type, p.NNN)" page header (now charm_library.page)
--   - the "Prerequisite(s): ..." line (now charm_prerequisite_abilities /
--     charm_prerequisite_charms / charm_library.prerequisite_essence)
--   - "[Label] text" mode blocks (now charm_modes)
-- These two migrations strip that now-duplicated text, leaving only the
-- charm's actual flavor/mechanics prose.

-- 1. Strip "[Label] text" blocks. Verified beforehand that exactly the 134
--    charms with charm_modes rows matched, and zero charms outside that set
--    would change (no false positives from inline bracket placeholders like
--    "[Ability] Excellency"'s "Prerequisite: [Ability] 1").
update public.charm_library
set description = regexp_replace(description, '\n\n\[[^\]]+\].*?(?=\n\n\[[^\]]+\]|$)', '', 'g')
where description is distinct from regexp_replace(description, '\n\n\[[^\]]+\].*?(?=\n\n\[[^\]]+\]|$)', '', 'g');

-- 2. Strip the leading "(...)" page header and "Prerequisite(s): ..." line.
--    Two independent regexes since 2 of 482 charms were missing one or the
--    other (e.g. "Naked Soul Insight" has no Prerequisite line; "Fists of
--    Iron Technique" has no page header).
update public.charm_library
set description = regexp_replace(regexp_replace(description, '^\([^)]*\)\n\n', ''), '^Prerequisites?:[^\n]*\n', '');
