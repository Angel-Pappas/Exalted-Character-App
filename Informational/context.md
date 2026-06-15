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
- **Defenses**: Parry, Evasion, Soak, Hardness, Resolve — currently simple number fields. Also has **Defend Other** and **Full Defense** toggle switches at the bottom of the panel
- **Motes**: one pool with Current, Committed, Total — all manually entered for now
- **Charms**: grouped into categories (e.g. combat, utility); each charm has a name and description text; clickable to expand in-panel; categories and charms draggable to reorder
- **Effects**: same structure as Charms — categories of named effects with description text; same drag behavior
- **Inventory**: flat item list with 3 fixed sections (Weapons, Armor, Other) — see below

## Inventory System
Items are stored as a flat `InventoryItem[]` array, grouped by `kind` at render time. Sections are always: Weapons → Armor → Other (in that order).

### Item Fields
Every item has: `id`, `kind`, `name`, `type`, `equipped`, `tags: string[]`, `notes`

Weapon-specific: `weight` (from gameData categories e.g. Light/Medium/Heavy/Unarmed), `artifact: boolean`, `artifactColor` (red/green/blue/white/silver/gold), `accuracy`, `damage`, `defense`, `overwhelming`

Armor-specific: `type` (category from gameData), `soak`, `mobilityPen`, `hardness`

### Item Modal (new item / edit)
- Kind selector (weapon / armor / other)
- **Weapons**: weight buttons (from GameData table) → auto-fills stats; Combat Type (Melee/Ranged) selector auto-adds tag; Artifact toggle → +1 all stats; color picker; tag picker (grouped chips from GameData tagGroups, Type Tags hidden since Melee/Ranged/Artifact handled by UI); Shield tag auto-applies −1 damage
- **Armor**: category buttons (from GameData) → auto-fills stats; Artifact toggle → +1 Soak+Hardness; tag picker
- **Other**: type text field + notes textarea; expands on click in the inventory list (no modal needed for viewing)
- Tags stored as `string[]`; tag chips show description on hover; custom tags can be typed in

### Inventory Row Display
- Equipped checkbox (colored by artifactColor if artifact)
- Item name (colored by artifactColor if artifact); whole row gets subtle artifact tint
- Weapons: inline stats `Ac # Da # De # Ov #` (labels stone-500, values stone-300)
- Armor: inline stats `So # MP # Ha #`
- Other: ▸/▾ chevron; clicking name expands notes inline

### Fists of Iron Technique (FoI)
A charm toggle on the **Weapons section header**. Disabled (greyed, tooltip) if no Unarmed weapon exists.

Clicking opens a modal:
- Header: title + toggle switch (active/inactive)
- "Count as" row: weight buttons (all non-Unarmed from GameData) + Artifact button (separated by divider)
- Tag picker: Universal + Melee tags only, single-select, excludes Artifact
- Footer: Cancel | Save

When activated: writes the chosen weight's stats (+ item artifact bonus + FoI artifact bonus) to all Unarmed weapons; adds chosen tag to `item.tags`; applies tag stat effects (Shield → −1 damage, min 0). Pre-FoI stats saved as originals for restoration.

When deactivated: restores originals exactly. Removing the last Unarmed weapon auto-clears FoI.

On unarmed weapon rows: tag chip (hover = description) + colored weight badge (L=blue, M=green, H=yellow) shown before stats.

## Options Page
Route: `/options` — accessible from header of CharacterListPage and CharacterPage. Character-independent.

Currently has one tab: **Information**, which contains three editable reference tables:

### Weapons Table
Rows: Category (text), Accuracy, Damage, Defense, Overwhelming (numbers). Default rows: Light, Medium, Heavy, Unarmed with rulebook values. Hover column headers for stat descriptions.

### Armor Table
Rows: Category (text), Soak, Mobility Penalty, Hardness (numbers). Default rows: Light Armor, Heavy Armor.

### Equipment Tags
Groups of tags, each tag has Name + Description. Five default groups:
- **Type Tags**: Artifact, Melee, Ranged
- **Universal Tags**: Balanced, Concealable, Flexible, Improvised, Natural/Worn, Paired, Piercing, Pulling, Thrown
- **Armor Tags**: Buoyant, Silent
- **Melee Tags**: Chopping, Defensive, Disarming, Off-Hand, Reaching, Shield, Smashing, Two-Handed
- **Ranged Tags**: Flame, Mounted, One-Handed, Powerful

All tables are editable inline. Rows/groups/tags can be added and removed. Saved to Supabase `game_data` table per user (upsert on conflict). 1-second debounce auto-save.

GameData is loaded in CharacterPage and passed down to SheetTab → InventoryPanel → ItemModal so the item creation modal always reflects the user's current Options data.

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

## What's Been Built
- Auth (email/password via Supabase)
- Character list with create/delete; Options link in header
- Character page with 4 tabs: Sheet, Milestones, Notes, Characters; Options link in header
- **Options page** (`/options`): Information tab with editable Weapons, Armor, Equipment Tags reference tables; saved to `game_data` Supabase table
- **Character Sheet panels (11 total):**
  - Attributes, Abilities (with Excellency + Specialty), Defenses (with Defend Other + Full Defense toggles), Motes, Health track, Languages, Merits, Intimacies
  - Charms — categories + expandable entries; drag to reorder charms and categories
  - Effects — same structure as Charms
  - Inventory — 3 fixed sections (Weapons/Armor/Other); full item modal with kind-specific fields, auto-fill from GameData, tag picker; FoI charm toggle on Weapons header
- Milestones: 4-type XP log with session reward form, purchase form, editable transaction table
- Notes: free-form textarea
- Characters tab: NPC list with per-NPC notes
- Auto-save to Supabase (1 second debounce)
- 404-on-refresh fix via vercel.json rewrites
- **Drag-and-drop grid layout editor** (11 panels, 128-column grid, Edit Layout toggle)

## Next Planned Features
- Calculated/dynamic defenses (currently manual number fields)
