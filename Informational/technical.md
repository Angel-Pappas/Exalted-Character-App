# Technical Reference

## Stack
| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 + TypeScript |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite` plugin) |
| Auth + Database | Supabase (free tier) |
| Hosting | Vercel (free tier, Hobby plan) |
| Repo | GitHub — https://github.com/Angel-Pappas/Exalted-Character-App (must be **public**) |

## Local Setup
- Working directory: `C:\Users\AngeP\Exalted-Character-App`
- Node: v24, npm: v11
- Run dev server: `npm run dev` → http://localhost:5173
- Build: `npm run build`
- Git identity: `ange.pap@hotmail.com` / `Angel-Pappas` (must match GitHub account for Vercel deploys)

## Environment Variables
Stored in `.env.local` (gitignored) and in Vercel project settings:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase publishable/anon key

## Supabase
- Project URL: `https://dtuxmjiknsefowfdawim.supabase.co`
- Auth: email/password
- Database: `characters` table + `game_data` table, both with Row Level Security

### Characters Table Schema
```sql
characters (
  id uuid primary key,
  user_id uuid references auth.users(id),
  name text,
  data jsonb,  -- all character data stored here
  created_at timestamptz,
  updated_at timestamptz
)
```

### Game Data Table Schema
```sql
game_data (
  user_id uuid primary key references auth.users(id),
  data jsonb   -- GameData: { weapons, armor, tagGroups }
)
```
Upserted on conflict by `user_id`. Loaded in `CharacterPage` and `OptionsPage` on mount. Falls back to `DEFAULT_GAME_DATA` if no row exists.

### `data` JSONB Structure (CharacterData type)
```ts
{
  sheet: {
    attributes: Record<string, number>,
    abilities: Record<string, {
      rating: number,
      specialty: string,
      excellency: boolean
    }>,
    defenses: Record<string, number>,         // Parry, Evasion, Soak, Hardness, Resolve (calculated from attributes/abilities/inventory)
    defenseOther: boolean,
    fullDefense: boolean,
    essence: number,                          // 1–5, used in Hardness calculation and mote pool lookup
    anima: number,                            // 0–10, current anima level; auto-increments on mote spend
    defenseBonus: { parry: number, evasion: number, soak: number, hardness: number, resolve: number },
    languages: string[],
    merits: { id, type: 'Primary'|'Secondary'|'Tertiary', name }[],
    intimacies: { id, intensity: 'Minor'|'Major'|'Defining', description }[],
    motes: { current: number, committed: number, total: number },
    health: { penalty: string, checked: boolean }[],
    layout: { i: string, x: number, y: number, w: number, h: number }[],
    charms: { id, name, charms: { id, name, text }[] }[],
    effects: { id, name, effects: { id, name, text }[] }[],
    inventory: InventoryItem[]
  },
  milestones: {
    id: string,
    kind: 'gain' | 'purchase',
    personal: number,
    exalted: number,
    minor: number,
    major: number,
    description: string,
    date: string (ISO)
  }[],
  notes: string,
  npcs: { id, name, notes }[]
}
```

### InventoryItem Type
```ts
interface InventoryItem {
  id: string
  kind: 'weapon' | 'armor' | 'other'
  name: string
  type: string           // armor category label or freeform type (for 'other')
  equipped: boolean
  // weapon fields
  weight?: string        // category label from gameData.weapons (e.g. 'Light', 'Unarmed')
  artifact?: boolean
  artifactColor?: 'red' | 'green' | 'blue' | 'white' | 'silver' | 'gold'
  accuracy?: number
  damage?: number
  defense?: number
  overwhelming?: number
  // armor fields
  soak?: number
  mobilityPen?: number
  hardness?: number
  // weapon + armor
  tags?: string[]        // was string in older data; normTags() handles legacy values
  // other
  notes?: string
}
```

### GameData Type (stored in game_data table)
```ts
interface GameData {
  weapons: WeaponTableRow[]       // { category, accuracy, damage, defense, overwhelming }
  armor: ArmorTableRow[]          // { category, soak, mobilityPenalty, hardness }
  tagGroups: TagGroup[]           // { group, tags: { name, description }[] }
  essenceMotes: EssenceMoteRow[]  // { essence: 1–5, motes: number } — mote pool by essence
  animaStates: AnimaStateRow[]    // { level: 0–10, label: string } — anima label lookup
}
```

Default values in `DEFAULT_GAME_DATA` (character.ts):
- Weapons: Light(Ac+2,Da+0,De+1,Ov+1), Medium(Ac+1,Da+1,De+1,Ov+1), Heavy(Ac+0,Da+2,De+1,Ov+1), Unarmed(Ac+2,Da+0,De+1,Ov+1)
- Armor: Light Armor(So+1,MP0,Ha0), Heavy Armor(So+2,MP-1,Ha0)
- TagGroups: Type Tags, Universal Tags, Armor Tags, Melee Tags, Ranged Tags — all with full rulebook descriptions

## File Structure
```
src/
  App.tsx                        # Router + AuthProvider
  index.css                      # Global styles (Tailwind import, spinner removal, no-scrollbar utility)
  main.tsx
  lib/
    supabase.ts                  # Supabase client
  contexts/
    AuthContext.tsx               # Auth state, signIn, signOut
  components/
    ProtectedRoute.tsx            # Redirects to /login if not authenticated
    TabBar.tsx                    # 4-tab navigation bar
  pages/
    LoginPage.tsx                 # Email/password login
    CharacterListPage.tsx         # Create/select/delete characters; Options link in header
    CharacterPage.tsx             # Main character view with tabs + auto-save; loads GameData from Supabase
    OptionsPage.tsx               # /options — Information tab with editable Weapons/Armor/Tags tables
  tabs/
    SheetTab.tsx                  # Character sheet (grid layout, all panels); receives gameData prop
    MilestonesTab.tsx             # XP tracking
    NotesTab.tsx                  # Free-form notes
    CharactersTab.tsx             # NPC/character log
  types/
    character.ts                  # All TypeScript interfaces + DEFAULT_GAME_DATA
Informational/
  scope.md
  context.md
  technical.md (this file)
supabase/
  schema.sql                     # DB schema to run in Supabase SQL editor
vercel.json                      # SPA rewrite rule (fixes 404 on refresh)
```

## Game Data Constants (in SheetTab.tsx)
**Attributes:**
- Physical: Strength, Dexterity, Stamina
- Social: Charisma, Manipulation, Appearance
- Mental: Perception, Intelligence, Wits

**Abilities (14):**
Athletics, Awareness, Close Combat, Craft, Embassy, Integrity, Navigate, Performance, Physique, Presence, Ranged Combat, Sagacity, Stealth, War

**Defenses (5):** Parry, Evasion, Soak, Hardness, Resolve

**Health track:** -0, -1, -1, -2, -2, -4, Incap (7 boxes, no damage types)

## Layout System (SheetTab)
- Uses `react-grid-layout` v2 (`GridLayout`, `useContainerWidth`, `noCompactor` imports) and `react-resizable`
- **128-column grid**, row height = 10px, margins = [0,0], containerPadding = [0,0]
- `freeCompactor = { ...noCompactor, allowOverlap: true }` — prevents panels from colliding/flinging during drag
- `autoSize={false}` + `minHeight: 2000px` — grid canvas extends well below content
- **13 independent panels:** `attributes`, `abilities`, `defenses`, `essence`, `motes`, `anima`, `health`, `merits`, `languages`, `intimacies`, `charms`, `effects`, `inventory`
- Default layout (DEFAULT_LAYOUT) positions panels in column groups across the 128-unit grid
- If the saved layout is missing entries for new panels, those panels are auto-added from DEFAULT_LAYOUT on load
- Layout is stored in `SheetData.layout: PanelLayout[]` and saved to Supabase via auto-save
- **Edit mode toggle** (top-right of window header): when ON, panels are draggable/resizable with an amber drag handle bar at top; amber grid lines are shown. When OFF, layout is locked and handles are hidden.
- `dragConfig={{ handle: '.drag-handle' }}` — only the top handle bar triggers panel dragging
- Resize handle: 20×20px amber corner (z-index 50), above drag handle (z-index 5)

### PanelLayout type (in character.ts)
```ts
interface PanelLayout { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number }
```

## Panel Components (all defined in SheetTab.tsx)

### CharmPanel / EffectPanel
- Categories of named entries (charms or effects) with description text
- Each entry is clickable to expand its description inline
- Categories and entries are draggable to reorder (within/between categories)
- Support: add/remove/edit categories, add/remove/edit entries, inline editing

### InventoryPanel
Flat `InventoryItem[]` list rendered in 3 fixed sections: **Weapons → Armor → Other**.

**State:**
- `modal` — controls which item is open in ItemModal
- `foiModalOpen: boolean` — FoI modal visibility
- `foi: FoiState` — current Fists of Iron Technique state
- `foiOriginals: Record<string, Partial<InventoryItem>>` — pre-FoI stats/tags saved per item id for restoration
- `expanded: Record<string, boolean>` — tracks which "other" items are expanded to show notes

**FoiState:**
```ts
interface FoiState { active: boolean; weight: string | null; tag: string | null; artifact: boolean }
```

**Item Row Display (Weapons):**
`[checkbox] [name] [FoI tag chip?] [FoI weight badge?] [Ac # Da # De # Ov #] [edit] [remove]`
- FoI tag chip and weight badge only appear on Unarmed weapons when FoI is active
- Weight badge colors: L=blue-600, M=green-600, H=yellow-500
- Artifact tints entire row (`artifactRowCls`) and colors the name text (`artifactTextCls`)

**Item Row Display (Armor):**
`[checkbox] [name] [So # MP # Ha #] [edit] [remove]`

**Item Row Display (Other):**
`[checkbox] [▸/▾ name (click to expand)] [edit] [remove]`
- Clicking name toggles expanded div showing type + notes

**WEAPONS section header:** Fists of Iron button. Disabled if no Unarmed weapon exists (tooltip: "You need an unarmed weapon").

**FoI logic (`applyFoi`):**
1. If already active, restore originals first
2. Save originals on first activation (current stats + tags)
3. Look up the chosen weight row from `gameData.weapons`
4. Compute stats: `base + item.artifact bonus + foi.artifact bonus`, floored at 0 via `Math.max(0, n)`
5. Remove old FoI tag and old FoI Artifact tag from `item.tags`
6. Add new tag (and 'Artifact' if foi.artifact)
7. Apply Shield penalty if tag is Shield (−1 damage, min 0)
8. Call `onChange` with updated items

`deactivateFoi`: restores originals to all affected items; clears `foi` and `foiOriginals`.

`removeItem`: if FoI is active and no Unarmed weapons remain after removal, auto-clears FoI.

### ItemModal
Props: `item`, `onSave`, `onClose`, `gameData`

**Internal state:** `form` (all item fields), `weaponCombatType: 'melee' | 'ranged' | null`

**Key helpers:**
- `normTags(t: unknown): string[]` — converts legacy `string` tags to array (splits by comma)
- `f0 = (n: number) => Math.max(0, n)` — floors all auto-computed stats at 0
- `selectWeightRow(category)` — looks up gameData.weapons, applies artifact bonus, Shield penalty
- `selectArmorRow(category)` — looks up gameData.armor, applies artifact bonus (not to mobilityPenalty)
- `selectCombatType(ct)` — toggles Melee/Ranged in tags array
- `toggleArtifact()` — applies ±1 delta to all weapon or armor stats, floored via f0
- `toggleTag(name)` — toggles tag; if Shield, adjusts damage ±1

**Stat math rule:** `base (from table) + artifact bonus (item.artifact ? 1 : 0)`, all floored at 0. Selecting a new weight re-derives from the table base + current artifact state. Toggling artifact applies a ±1 delta to the current values.

**Tag picker:** Groups from `gameData.tagGroups`; "Type Tags" group always hidden (Melee/Ranged/Artifact handled by dedicated UI); Armor tag group hidden for weapons; Melee/Ranged tag groups shown based on `weaponCombatType`.

**Width:** `w-[480px]`; `max-h-full`; scrollable content area.

### FoiModal
Props: `current: FoiState`, `foiWeights`, `foiTags`, `onSave`, `onClose`

- Header: "Fists of Iron" title + toggle switch (orange when active)
- Weight row: buttons from `foiWeights` (all non-Unarmed gameData.weapons) + Artifact button after divider
- Tag picker: single-select chips from Universal + Melee groups, excluding Artifact tag; shows description of selected tag below
- Footer: Cancel | Save (disabled if active but weight or tag is null)
- Passes full `FoiState` (including `active`) to `onSave`; parent routes to `applyFoi` or `deactivateFoi`

## CSS Utilities (index.css)
- `.no-scrollbar` — hides scrollbars on an element and all its descendants (cross-browser: `scrollbar-width: none`, `-webkit-scrollbar: display none`)
- `.react-resizable-handle` — custom amber resize corner, 20×20px, z-index 50

## Auto-save
- Triggered 1 second after any data change (debounced `setTimeout`)
- Character data saves full `CharacterData` to Supabase `characters.data` JSONB column
- GameData saves to `game_data` table via upsert (same 1-second debounce, in OptionsPage)
- Shows "Saving…" in header while in progress, disappears when done

## Known Quirks
- GitHub repo must be **public** — Vercel free (Hobby) plan blocks deploys from private repos by non-owner committers
- Git user email must be `ange.pap@hotmail.com` to match the GitHub account linked to Vercel
- Number inputs have spinners removed globally via CSS in `index.css`
- Saved layouts from before new panels were added will be missing those panel entries — handled by auto-merging DEFAULT_LAYOUT on load
- `InventoryItem.tags` was `string` in older saved data — `normTags()` in ItemModal handles backward compat
