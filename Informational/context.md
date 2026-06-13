# Context

## The Game: Exalted (Custom Version)
This is a custom/modified version of the Exalted tabletop RPG. Not all standard Exalted rules apply. Key things to know:

- **No favored abilities** — this version does not use the favored/caste ability system
- **Attributes** are grouped into Physical / Social / Mental (3 each, standard)
- **Abilities** are a custom reduced list (14 total — see Technical file)
- **Milestones** replace XP. There are 4 types: Personal, Exalted, Minor, Major. Each is tracked separately with its own earned/spent log
- **Excellency** is a charm that doubles dice for a given ability. It is tracked per-ability with a gold highlight on the row
- **Specialties** are sub-fields of abilities that add a bonus die. One specialty per ability, stored as a text field
- **Merits** have a type: Primary, Secondary, or Tertiary
- **Intimacies** have an intensity: Minor, Major, or Defining
- **Health track** has no damage types — boxes are simply checked/unchecked. Standard track: -0, -1, -1, -2, -2, -4, Incap
- **Defenses**: Parry, Evasion, Soak, Hardness, Resolve — currently simple number fields, planned to be made dynamic/calculated later
- **Motes**: one pool with Current, Committed, Total — all manually entered for now
- **Charms**: grouped into categories (e.g. combat, utility); each charm has a name and description text; clickable to expand in-panel
- **Effects**: same structure as Charms — categories of named effects with description text
- **Inventory**: categories of items; items currently have name only (more fields to be added later)

## The User
- **Angel** (angel.y.pappas@gmail.com / ange.pap@hotmail.com — GitHub/Vercel use the hotmail)
- Solo player, one primary character currently named **Kaien, Wall of the Sun**
- Comfortable giving layout/design direction in grid-unit terms
- Prefers to be walked through setup steps one at a time

## Workflow
- Development happens locally on Angel's Windows 11 PC at `C:\Users\AngeP\Exalted-Character-App`
- Changes are pushed to GitHub by Claude Code using the stored token
- Vercel auto-deploys on every push to `main`
- **Important:** the GitHub repo must be **public** for Vercel free-tier auto-deploy to work
- Angel reviews changes on the live Vercel URL — does not run a local dev server
- Angel says "push" (or "yes") when ready to deploy — do not push until told

## What's Been Built So Far
- Auth (email/password via Supabase)
- Character list with create/delete
- Character page with 4 tabs: Sheet, Milestones, Notes, Characters
- **Character Sheet panels (11 total):**
  - Attributes, Abilities (with Excellency + Specialty), Defenses, Motes, Health track, Languages, Merits, Intimacies
  - Charms — categories + expandable entries with description; drag to reorder charms and categories
  - Effects — same structure as Charms
  - Inventory — categories + items (name only for now); drag to reorder items
- Milestones: 4-type XP log with session reward form, purchase form, editable transaction table
- Notes: free-form textarea
- Characters tab: NPC list with per-NPC notes
- Auto-save to Supabase (1 second debounce)
- 404-on-refresh fix via vercel.json rewrites
- **Drag-and-drop grid layout editor:**
  - 11 independent panels, freely movable and resizable
  - 128-column grid, row height 10px
  - "Edit Layout" toggle button in top-right of window header (outside the grid)
  - Amber grid lines visible in edit mode only; amber drag handle bar at top of each panel
  - Resize handle: amber corner bottom-right of each panel
  - Panels can freely overlap (no collision/push behavior)
  - Layout persisted per character in Supabase
  - New panels missing from a saved layout are automatically added at their default positions

## Next Planned Features
- Additional fields for Inventory items (user will specify)
- Calculated/dynamic defenses (currently manual number fields)
