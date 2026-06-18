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
- **Defenses**: Parry, Evasion, Soak, Hardness, Resolve — all **calculated** from attributes, abilities, and equipped items (not manually entered)
- **Motes**: one pool with Current, Committed, Total — Total is looked up from the EssenceMotes GameData table by essence level
- **Charms**: a global library in Supabase; players add charms from the library to their character sheet; some charms have mechanical implementations (e.g. FoI)

> **Important:** The book refers to "highest appropriate attribute" for some calculations. This app uses 9 custom attributes (not 3), with each stat mapped to a specific fixed attribute. Ignore any "highest attribute" wording from book quotes — the mappings are hardcoded.

## Exalt Types
Each character has an Exalt Type and a Caste (or Aspect, depending on the type). These are stored in the `exalt_types` Supabase table and managed by the admin in Admin → Tables → Exalt Types.

The `caste_label` field is either `'Caste'` or `'Aspect'` — controls the label shown in the character creation modal and on the sheet.

All 10 exalt types are seeded: Solar, Lunar, Terrestrial, Sidereal, Abyssal, Infernal, Alchemical, Liminal, Getimian, Dreaming Sun Chosen.

Exalt type and caste are set at character creation and displayed **read-only** on the sheet (merged into the Essence panel). They are not editable after creation.

## Defense Calculations
All five defenses are calculated automatically in SheetTab. Manual bonus fields (`defenseBonus`) are additive on top.

| Defense | Formula |
|---|---|
| Parry | `Math.ceil((Stamina + Close Combat) / 2) + wpnBonus + defenseBonus.parry` |
| Evasion | `Math.ceil((Dexterity + Athletics) / 2) + wpnBonus + defenseBonus.evasion` |
| Soak | `Math.ceil(Stamina / 2) + bestArmorSoak + defenseBonus.soak` |
| Hardness | `Essence + bestArmorHardness + defenseBonus.hardness` |
| Resolve | `Math.ceil((Wits + Integrity) / 2) + defenseBonus.resolve` |

**Weapon bonus (`wpnBonus`):** added to both Parry and Evasion. It equals the highest `defense` value among equipped weapons, but only when **Full Defense** or **Defend Other** is active. Otherwise 0.

**Armor:** only one armor can be equipped at a time. Equipping a new armor auto-unequips any other. Only the equipped armor's `soak` and `hardness` values contribute to defenses.

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
A charm whose button appears on the **Weapons section header** only when a charm with `mechanicalKey = 'foi'` is in the character's charm list and has `mechanicalEnabled = true`.

Clicking opens a modal:
- Header: title + toggle switch (active/inactive)
- "Count as" row: weight buttons (all non-Unarmed from GameData) + Artifact button (separated by divider)
- Tag picker: Universal + Melee tags only, single-select, excludes Artifact
- Footer: Cancel | Save

When activated: writes the chosen weight's stats (+ item artifact bonus + FoI artifact bonus) to all Unarmed weapons; adds chosen tag to `item.tags`; applies tag stat effects:
- Shield → −1 damage (min 0)
- Balanced → +1 overwhelming
- Improvised → −2 accuracy (min 0)
- Defensive → +1 defense

When deactivated: restores originals exactly. Removing the last Unarmed weapon auto-clears FoI.

**FoI state is persisted to Supabase** (stored in `SheetData.foi` and `SheetData.foiOriginals`) — survives refresh and week-long gaps.

On unarmed weapon rows: tag chip (hover = description) + colored weight badge (L=blue, M=green, H=yellow) shown before stats.

## Charm System

### Global Charm Library (`charm_library` table)
A shared Supabase table containing all available charms for the game. Readable by all users; writable only by admins.

Each library charm has:
- `id`, `ability` (which ability it belongs to), `name`, `description`
- `mechanical_key` (optional) — links to a coded implementation (e.g. `"foi"`)
- `sort_order`

### Per-Character Charms (`CharacterCharm[]` in SheetData)
Players add charms from the library to their character sheet. Each character charm record has:
```ts
interface CharacterCharm {
  id: string
  libraryId: string
  name: string
  libraryMechanicalKey: string | null   // denormalized from library at add time
  customDescription: string | null      // player-specific override text
  mechanicalKeyOverride: string | null  // player-specific mechanical key override
  mechanicalEnabled: boolean            // toggles the mechanical effect on/off
}
```

The **effective mechanical key** is: `mechanicalKeyOverride ?? libraryMechanicalKey`

### Charm UI (CharmPanel in SheetTab)
- Flat list of `CharacterCharm[]` per character
- "Browse" button opens `CharmBrowseModal` — fetches library from Supabase, grouped by ability, searchable, with "Add" button per charm
- Each charm row: name, description (custom or library), edit/revert/toggle controls
- Custom description overrides library text per character
- Reverting restores library description
- `mechanicalEnabled` toggle controls whether coded effects (like FoI button visibility) are active

### Mechanical Key Gating
Any UI feature gated by a mechanical key checks: does the character have a charm with that effective key AND `mechanicalEnabled = true`? If not, the feature is hidden. Example: FoI button only shows if a `'foi'` charm is present and enabled.

## Pages & Navigation

### Home Page (`/`)
Hub page with cards: Characters, Settings, Admin (admin only). Sign Out in header.

### Characters Page (`/characters`)
List of the current user's own characters. Each card shows name + ExaltType·Caste subtitle. "+ New Character" opens a modal — all 3 fields (name, exalt type, caste/aspect) are required before Create is enabled. Delete button appears on hover.

### Character Page (`/character/:id`)
Header: Back button + Edit Layout toggle. 4 tabs: Sheet, Milestones, Notes, Characters.

### Settings Page (`/options`) — all users
Left sidebar with sections:
- **Account**: username (read-only, with Change button), role (read-only), Change Password button
- **Appearance**: light/dark theme toggle (persisted to localStorage via ThemeContext)

Password change uses a modal with Current Password / New Password / Confirm Password fields, each with an inline eye toggle. Re-authenticates with current password before applying the change.

Change Username updates the auth email to `newusername@exalted.local` via `supabase.auth.updateUser`.

### Admin Page (`/setup`) — admin only
Left sidebar tabs:
- **Tables**: editable reference tables (Weapons, Armor, Equipment Tags, Essence Motes, Anima States, Exalt Types)
- **Charms**: full CRUD for the global charm library, grouped by ability
- **Users**: all signed-up users with username, role dropdown, character count, expandable character list; per-character Move and Delete actions; per-user Delete button (hidden for self)

## Auth System
- Username + password only — no real emails exposed to users
- Supabase stores accounts as `username@exalted.local` internally
- `signIn`: if input contains `@` use as raw email (legacy support), otherwise append `@exalted.local`
- `signUp`: always appends `@exalted.local`
- Email confirmation is disabled in Supabase settings
- Login page shows eye-icon toggle on all password fields

## User & Role System

### Roles
Two roles: `admin` and `player`. Stored in the `user_profiles` table. New users auto-get `player` role via a Supabase trigger on signup.

- **Admin**: can write to `charm_library`, manage all users, access `/setup`
- **Player**: read-only access to charm library, no access to `/setup`

Role is fetched from `user_profiles` on login and exposed via `AuthContext.role`.

Angel's account username: `angel`, UUID: `c5d208d8-3d47-4dc3-b76b-c211d8486c3b`, role: `admin`.

### Failsafes
- Cannot change your own role
- Cannot demote the last admin (would leave app with zero admins)
- Cannot delete yourself

## The User
- **Angel** (GitHub/Vercel: ange.pap@hotmail.com)
- Building for himself and his co-players
- Comfortable giving layout/design direction in grid-unit terms
- Prefers to be walked through setup steps one at a time

## Workflow
- Development happens locally on Angel's Windows 11 PC at `C:\Users\AngeP\Exalted-Character-App`
- Changes are pushed to GitHub by Claude Code — always push immediately after every code change
- Vercel auto-deploys on every push to `main`
- **Important:** the GitHub repo must be **public** for Vercel free-tier auto-deploy to work
- Angel reviews changes on the live Vercel URL — does not run a local dev server
- **Never prompt for permission** except before permanently deleting DB data or changing admin access

## What's Been Built
- Username+password auth (no email exposed); eye-icon toggle on all password fields
- Hub home page with role-aware cards
- Character list with create (all 3 fields required) / delete; per-character ExaltType·Caste display
- Character page with 4 tabs: Sheet, Milestones, Notes, Characters
- **Settings page** (`/options`): Account (username/password edit) + Appearance (theme toggle)
- **Admin page** (`/setup`): Tables + Charms + Users tabs; full user management with role/delete/move-character
- **Exalt Types**: global table, seeded with 10 types, admin CRUD in Admin → Tables
- **Character Sheet panels (13 total):** all scrollable with hidden scrollbars
  - Attributes, Abilities (with Excellency + Specialty), Defenses (calculated, with Defend Other + Full Defense toggles + manual bonus fields), Motes (Current/Committed/Total with auto-total from essence), Health track, Languages, Merits, Intimacies
  - Charms — flat CharacterCharm list, browse-from-library modal, custom descriptions, mechanical gating
  - Effects — categories + expandable entries
  - Inventory — 3 fixed sections (Weapons/Armor/Other); full item modal; FoI charm toggle gated by mechanical key
  - Essence panel (includes read-only ExaltType + Caste display)
- Milestones: 4-type XP log with session reward form, purchase form, editable transaction table
- Notes: free-form textarea
- Characters tab: NPC list with per-NPC notes
- Auto-save to Supabase (1 second debounce)
- **Drag-and-drop grid layout editor** (13 panels, 128-column grid, Edit Layout toggle)
- **User role system**: admin/player, DB-enforced via RLS + SECURITY DEFINER functions

## Next Planned Features
- Light mode CSS variable theming (toggle exists, colors not yet wired up)
- More charm mechanical implementations (one-by-one as needed)
