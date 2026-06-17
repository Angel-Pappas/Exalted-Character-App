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
- Database tables: `characters`, `game_data`, `user_profiles`, `charm_library` — all with Row Level Security

### Characters Table
```sql
characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  data jsonb,        -- all CharacterData stored here
  created_at timestamptz,
  updated_at timestamptz
)
```
RLS: users can only read/write their own rows.

### Game Data Table
```sql
game_data (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  data jsonb   -- GameData: { weapons, armor, tagGroups, essenceMotes, animaStates }
)
```
Upserted on conflict by `user_id`. Loaded in `CharacterPage` and `SetupPage` on mount. Falls back to `DEFAULT_GAME_DATA` if no row exists.

### User Profiles Table
```sql
user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('admin', 'player')),
  display_name text,
  created_at timestamptz
)
```
- Auto-created on signup via trigger `on_auth_user_created` → inserts `player` role
- RLS: all logged-in users can read all profiles; users can only update their own
- Admins: determined by `role = 'admin'`; Angel's UUID is `c5d208d8-3d47-4dc3-b76b-c211d8486c3b`

### Charm Library Table
```sql
charm_library (
  id uuid primary key default gen_random_uuid(),
  ability text not null default '',
  name text not null default '',
  description text not null default '',
  mechanical_key text,    -- e.g. 'foi'; null for reference-only charms
  sort_order integer not null default 0,
  created_at timestamptz,
  updated_at timestamptz
)
```
- RLS: everyone can read; only users with `role = 'admin'` in `user_profiles` can insert/update/delete

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
    defenses: Record<string, number>,   // manual bonus fields only; actual values are calculated
    defenseOther: boolean,
    fullDefense: boolean,
    essence: number,                    // 1–5
    anima: number,                      // 0–10
    defenseBonus: { parry: number, evasion: number, soak: number, hardness: number, resolve: number },
    languages: string[],
    merits: { id, type: 'Primary'|'Secondary'|'Tertiary', name }[],
    intimacies: { id, intensity: 'Minor'|'Major'|'Defining', description }[],
    motes: { current: number, committed: number, total: number },
    health: { penalty: string, checked: boolean }[],
    layout: { i: string, x: number, y: number, w: number, h: number }[],
    charms: CharacterCharm[],           // per-character charm records (NOT CharmCategory[])
    effects: { id, name, effects: { id, name, text }[] }[],
    inventory: InventoryItem[],
    foi: FoiState,                      // persisted FoI toggle state
    foiOriginals: Record<string, Partial<InventoryItem>>  // pre-FoI stats per item id
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

### Key Types (character.ts)

#### CharacterCharm
```ts
interface CharacterCharm {
  id: string
  libraryId: string
  name: string
  libraryMechanicalKey: string | null   // denormalized from charm_library at add time
  customDescription: string | null      // player override; null = use library description
  mechanicalKeyOverride: string | null  // player override of mechanical key
  mechanicalEnabled: boolean            // whether coded mechanical effect is active
}
// effective key = mechanicalKeyOverride ?? libraryMechanicalKey
```

#### LibraryCharm
```ts
interface LibraryCharm {
  id: string
  ability: string
  name: string
  description: string
  mechanicalKey: string | null
  sort_order: number
}
```

#### FoiState
```ts
interface FoiState {
  active: boolean
  weight: string | null
  tag: string | null
  artifact: boolean
}
```

#### InventoryItem
```ts
interface InventoryItem {
  id: string
  kind: 'weapon' | 'armor' | 'other'
  name: string
  type: string
  equipped: boolean
  weight?: string         // gameData.weapons category label
  artifact?: boolean
  artifactColor?: 'red' | 'green' | 'blue' | 'white' | 'silver' | 'gold'
  accuracy?: number
  damage?: number
  defense?: number
  overwhelming?: number
  soak?: number
  mobilityPen?: number
  hardness?: number
  tags?: string[]         // was string in older data; normTags() handles legacy
  notes?: string
}
```

### GameData Type
```ts
interface GameData {
  weapons: WeaponTableRow[]       // { category, accuracy, damage, defense, overwhelming }
  armor: ArmorTableRow[]          // { category, soak, mobilityPenalty, hardness }
  tagGroups: TagGroup[]           // { group, tags: { name, description }[] }
  essenceMotes: EssenceMoteRow[]  // { essence: 1–5, motes: number }
  animaStates: AnimaStateRow[]    // { level: 0–10, label: string }
}
```

Default values in `DEFAULT_GAME_DATA`:
- Weapons: Light(Ac+2,Da+0,De+1,Ov+1), Medium(Ac+1,Da+1,De+1,Ov+1), Heavy(Ac+0,Da+2,De+1,Ov+1), Unarmed(Ac+2,Da+0,De+1,Ov+1)
- Armor: Light Armor(So+1,MP0,Ha0), Heavy Armor(So+2,MP-1,Ha0)

## File Structure
```
src/
  App.tsx                        # Router + AuthProvider + ThemeProvider
  index.css                      # Global styles
  main.tsx
  lib/
    supabase.ts                  # Supabase client
  contexts/
    AuthContext.tsx               # Auth state + role (UserRole: 'admin'|'player')
    ThemeContext.tsx              # Light/dark theme, persisted to localStorage
  components/
    ProtectedRoute.tsx
    TabBar.tsx
  pages/
    LoginPage.tsx
    CharacterListPage.tsx         # Shows Settings + Setup (admin) links
    CharacterPage.tsx             # Shows Settings + Setup (admin) links
    SettingsPage.tsx              # /options — Account + Appearance; all users
    SetupPage.tsx                 # /setup — Tables + Charms tabs; admin only
  tabs/
    SheetTab.tsx                  # Character sheet (grid layout, all panels, defense calculations)
    MilestonesTab.tsx
    NotesTab.tsx
    CharactersTab.tsx
  types/
    character.ts                  # All TypeScript interfaces + DEFAULT_GAME_DATA
informational/
  scope.md
  context.md
  technical.md (this file)
supabase/
  schema.sql                     # Full DB schema
vercel.json                      # SPA rewrite rule
```

## Game Data Constants (in SheetTab.tsx)
**Attributes (9 total):**
- Physical: Strength, Dexterity, Stamina
- Social: Charisma, Manipulation, Appearance
- Mental: Perception, Intelligence, Wits

**Abilities (14):**
Athletics, Awareness, Close Combat, Craft, Embassy, Integrity, Navigate, Performance, Physique, Presence, Ranged Combat, Sagacity, Stealth, War

**Defenses (5, all calculated):** Parry, Evasion, Soak, Hardness, Resolve

**Health track:** -0, -1, -1, -2, -2, -4, Incap (7 boxes, no damage types)

## Defense Calculations (SheetTab.tsx)
```ts
const stamina  = attrs['Stamina']  ?? 0
const dex      = attrs['Dexterity'] ?? 0
const wits     = attrs['Wits']     ?? 0
const cc       = abs['Close Combat']?.rating ?? 0
const ath      = abs['Athletics']?.rating   ?? 0
const integ    = abs['Integrity']?.rating   ?? 0

const equippedArmors  = items.filter(i => i.kind === 'armor' && i.equipped)
const equippedWeapons = items.filter(i => i.kind === 'weapon' && i.equipped)
const bestArmorSoak   = equippedArmors.length ? Math.max(...equippedArmors.map(i => i.soak ?? 0)) : 0
const bestArmorHard   = equippedArmors.length ? Math.max(...equippedArmors.map(i => i.hardness ?? 0)) : 0
const bestWpnDef      = equippedWeapons.length ? Math.max(...equippedWeapons.map(i => i.defense ?? 0)) : 0
const wpnBonus        = (data.fullDefense || data.defenseOther) ? bestWpnDef : 0

const parry    = Math.ceil((stamina + cc)    / 2) + wpnBonus + (db.parry   ?? 0)
const evasion  = Math.ceil((dex     + ath)   / 2) + wpnBonus + (db.evasion ?? 0)
const soakBase = Math.ceil(stamina           / 2)
const soak     = soakBase + bestArmorSoak + (db.soak ?? 0)
const hardness = (data.essence ?? 1) + bestArmorHard + (db.hardness ?? 0)
const resolve  = Math.ceil((wits   + integ)  / 2) + (db.resolve ?? 0)
```

## Layout System (SheetTab)
- Uses `react-grid-layout` v2 (`GridLayout`, `useContainerWidth`, `noCompactor`)
- **128-column grid**, row height = 10px, margins = [0,0], containerPadding = [0,0]
- `freeCompactor = { ...noCompactor, allowOverlap: true }` — prevents panels colliding during drag
- **13 independent panels:** `attributes`, `abilities`, `defenses`, `essence`, `motes`, `anima`, `health`, `merits`, `languages`, `intimacies`, `charms`, `effects`, `inventory`
- Layout saved in `SheetData.layout`; new panels auto-merged from DEFAULT_LAYOUT on load
- Edit mode toggle: amber drag handle bars + amber grid lines visible; draggable/resizable

## Panel Components (SheetTab.tsx)

### CharmPanel
- Flat `CharacterCharm[]` list
- "Browse" button → `CharmBrowseModal`: fetches `charm_library` from Supabase on open, grouped by ability, searchable, "Add" per charm
- Each row: name, description, edit/revert/toggle controls
- `mechanicalEnabled` toggle gates coded features
- Effective key: `mechanicalKeyOverride ?? libraryMechanicalKey`

### InventoryPanel
Flat `InventoryItem[]` rendered in 3 sections: Weapons → Armor → Other.

**Single-armor rule:** equipping an armor auto-unequips all others.

**FoI button:** only rendered when a charm with effective key `'foi'` exists and `mechanicalEnabled = true`.

**FoI tag effects (applyFoi):**
- Shield → damage −1 (min 0)
- Balanced → overwhelming +1
- Improvised → accuracy −2 (min 0)
- Defensive → defense +1

**FoI state (`foi` + `foiOriginals`) is persisted in SheetData → Supabase**, not React state.

### ItemModal
Key helpers:
- `normTags(t)` — handles legacy `string` tags (splits by comma)
- `selectWeightRow(category)` — looks up gameData.weapons, applies artifact bonus + Shield penalty
- `selectArmorRow(category)` — looks up gameData.armor, applies artifact bonus
- `toggleArtifact()` — ±1 delta to all stats, floored at 0

### FoiModal
- Weight row: non-Unarmed gameData.weapons + Artifact button
- Tag picker: single-select, Universal + Melee groups, excludes Artifact
- Save disabled if active but weight or tag is null

## Settings & Setup Pages

### SettingsPage (`/options`)
All users. Left sidebar: Account | Appearance.
- **Account**: email (read-only), role (read-only), username (editable → saves to `user_profiles.display_name`), Change Password button
- **Password modal**: Current / New / Confirm fields, each with inline eye-icon toggle; re-authenticates via `signInWithPassword` before calling `updateUser`
- **Appearance**: light/dark toggle via `ThemeContext` (persisted to `localStorage`)

### SetupPage (`/setup`)
Admin only. Tabs: Tables | Charms.
- **Tables**: editable Weapons, Armor, Equipment Tags, Essence Motes, Anima States tables; saved to `game_data`
- **Charms**: add/edit/delete `charm_library` rows; grouped by ability; inline `EditCharmRow` component; only visible when `role === 'admin'`

### ThemeContext
```ts
// contexts/ThemeContext.tsx
type Theme = 'dark' | 'light'
// persists to localStorage; toggles 'light-mode' class on document.documentElement
// Light mode CSS not yet implemented — toggle exists for future theming pass
```

## AuthContext
```ts
// contexts/AuthContext.tsx
export type UserRole = 'admin' | 'player'

interface AuthContextType {
  session: Session | null
  user: User | null
  role: UserRole | null   // fetched from user_profiles on login
  loading: boolean
  signIn: (email, password) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}
```
Role is fetched from `user_profiles` on `getSession()` and on `onAuthStateChange`.

## CSS Utilities (index.css)
- `.no-scrollbar` — hides scrollbars cross-browser
- `.react-resizable-handle` — custom amber resize corner, 20×20px, z-index 50
- Number input spinners removed globally

## Auto-save
- 1-second debounce after any data change
- Character data: full `CharacterData` → `characters.data` JSONB
- GameData: upsert → `game_data` per user
- "Saving…" shown in header while in progress

## Known Quirks
- GitHub repo must be **public** — Vercel free plan blocks deploys from private repos
- Git user email must be `ange.pap@hotmail.com` to match the GitHub account linked to Vercel
- `InventoryItem.tags` was `string` in older saved data — `normTags()` handles backward compat
- Saved layouts missing entries for new panels are auto-merged from DEFAULT_LAYOUT on load
- Light mode toggle exists but app colors are all hardcoded stone/amber — a CSS variable theming pass is needed to make it visually functional
