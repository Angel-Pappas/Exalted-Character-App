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
- Auth: username + password only. Stored internally as `username@exalted.local`. Email confirmation is **disabled**.
- Database tables: `characters`, `game_data`, `user_profiles`, `charm_library`, `exalt_types` — all with Row Level Security

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
RLS: users can only read/write their own rows. Admins can read/update/delete all rows.

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
  username text,       -- auto-set from auth email (strips @exalted.local) on insert
  created_at timestamptz
)
```
- Auto-created on signup via trigger `on_auth_user_created` → inserts `player` role
- Trigger `on_profile_created` (BEFORE INSERT, SECURITY DEFINER) sets `username` from auth email
- `is_admin()` SECURITY DEFINER function used in RLS policies to avoid recursion
- Admins: can read/update all profiles; players: own row only
- Angel's UUID: `c5d208d8-3d47-4dc3-b76b-c211d8486c3b`

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
RLS: everyone can read; only admins can insert/update/delete.

### Exalt Types Table
```sql
exalt_types (
  id uuid primary key default gen_random_uuid(),
  name text,
  caste_label text check (caste_label in ('Caste', 'Aspect')),
  castes text[],
  sort_order integer
)
```
Seeded with 10 types. Admin CRUD in Admin → Tables → Exalt Types.

### Key RLS / Security Functions
```sql
-- Avoids recursive RLS when checking admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
$$;

-- Admin-only user deletion (called via supabase.rpc)
CREATE OR REPLACE FUNCTION delete_user(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
```

### `data` JSONB Structure (CharacterData type)
```ts
{
  sheet: {
    exaltType: string,              // name matching exalt_types.name
    caste: string,                  // caste/aspect name
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
    charms: CharacterCharm[],
    effects: { id, name, effects: { id, name, text }[] }[],
    inventory: InventoryItem[],
    foi: FoiState,
    foiOriginals: Record<string, Partial<InventoryItem>>
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

#### ExaltType
```ts
interface ExaltType {
  id: string
  name: string
  casteLabel: 'Caste' | 'Aspect'
  castes: string[]
  sort_order: number
}
```

#### CharacterCharm
```ts
interface CharacterCharm {
  id: string
  libraryId: string
  name: string
  libraryMechanicalKey: string | null
  customDescription: string | null
  mechanicalKeyOverride: string | null
  mechanicalEnabled: boolean
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
  weight?: string
  artifact?: boolean
  artifactColor?: 'red' | 'green' | 'blue' | 'white' | 'silver' | 'gold'
  accuracy?: number
  damage?: number
  defense?: number
  overwhelming?: number
  soak?: number
  mobilityPen?: number
  hardness?: number
  tags?: string[]
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

## AuthContext
```ts
// contexts/AuthContext.tsx
export type UserRole = 'admin' | 'player'
const DOMAIN = '@exalted.local'
export function usernameToEmail(username: string) { return `${username.trim().toLowerCase()}${DOMAIN}` }
export function emailToUsername(email: string) { return email.endsWith(DOMAIN) ? email.slice(0, -DOMAIN.length) : email }

interface AuthContextType {
  session: Session | null
  user: User | null
  username: string              // derived from email, @exalted.local stripped
  role: UserRole | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<{ error: string | null }>
  signUp: (username: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}
// signIn: if input contains '@' use as raw email (legacy), else append @exalted.local
```

## File Structure
```
src/
  App.tsx                        # Router + AuthProvider + ThemeProvider
  index.css                      # Global styles
  main.tsx
  lib/
    supabase.ts                  # Supabase client
  contexts/
    AuthContext.tsx               # Auth state + role + username
    ThemeContext.tsx              # Light/dark theme, persisted to localStorage
  components/
    ProtectedRoute.tsx
    TabBar.tsx
  pages/
    LoginPage.tsx                 # Username+password; eye-icon on all password fields
    HomePage.tsx                  # Hub: Characters/Settings/Admin cards
    CharactersPage.tsx            # Character list + creation modal
    CharacterPage.tsx
    SettingsPage.tsx              # /options — Account + Appearance
    SetupPage.tsx                 # /setup — Tables | Charms | Users tabs
  tabs/
    SheetTab.tsx                  # All 13 panels + defense calc + FoI + CharmPanel
    MilestonesTab.tsx
    NotesTab.tsx
    CharactersTab.tsx
  types/
    character.ts                  # All TypeScript interfaces + DEFAULT_GAME_DATA
info/
  scope.md
  context.md
  technical.md (this file)
  SESSION_SUMMARY.md
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
- All panels: `overflow-y-auto no-scrollbar h-full` — scrollable, no visible scrollbar
- Layout saved in `SheetData.layout`; new panels auto-merged from DEFAULT_LAYOUT on load
- Edit mode toggle: amber drag handle bars + amber grid lines visible; draggable/resizable

## Settings & Admin Pages

### SettingsPage (`/options`)
All users. Left sidebar: Account | Appearance.
- **Account**: username (read-only with Change button), role (read-only), Change Password button
- **Change Username modal**: new username → `supabase.auth.updateUser({ email: newname@exalted.local })`
- **Password modal**: Current / New / Confirm fields, each with inline eye-icon toggle; re-authenticates via `signInWithPassword` before calling `updateUser`
- **Appearance**: light/dark toggle via `ThemeContext` (persisted to `localStorage`)

### SetupPage (`/setup`) — "Admin" in UI
Admin only. Left sidebar tabs: Tables | Charms | Users.
- **Tables**: Weapons, Armor, Equipment Tags, Essence Motes, Anima States, Exalt Types — all editable, saved to `game_data` (except Exalt Types which go to `exalt_types` table)
- **Charms**: add/edit/delete `charm_library` rows; grouped by ability
- **Users**: all `user_profiles` + characters; role dropdown (locked for self + last admin); Delete user (locked for self); per-character Move (reassign `characters.user_id`) and Delete

### ThemeContext
```ts
type Theme = 'dark' | 'light'
// persists to localStorage; toggles 'light-mode' class on document.documentElement
// Light mode CSS not yet implemented
```

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
