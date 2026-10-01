# Technical Reference

## Stack
| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 + TypeScript (repo root, `src/`) |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite` plugin) |
| Backend / API | Laravel 13 (PHP 8.5) in `backend/`, answering `/api/*` |
| Database | MySQL 8.4 on our own VM (database `exalted`); SQLite in the dev checkout and tests |
| Hosting | Our own VM, nginx + php8.5-fpm — https://exalted.pappas.yoltobots.click |
| Repo | GitHub — https://github.com/Angel-Pappas/Exalted-Character-App |

Moved off Vercel + Supabase in October 2026. The `supabase/` folder holds the
old Postgres schema and migrations, kept only as a historical record.

## Folders on the VM
- `/home/ploi/exalted-dev` — the **dev checkout**: all editing, building and testing (SQLite).
- `/home/ploi/exalted.pappas.yoltobots.click` — the **live app**. Changed only by `./deploy.sh`.
- Node 22 / npm 11, PHP 8.5, Composer 2. No dev server is run; Angel reviews on the live URL.
- `npm run check` = `tsc -b`, `eslint`, `vitest`, then the backend's Pint, Larastan and Pest.

## Environment
- The React app needs no environment variables: it calls `/api` on its own origin.
- `backend/.env` (gitignored) holds the Laravel settings. Dev: SQLite. Live: MySQL
  credentials, `APP_ENV=production`, `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`.

## API and Database
- Auth: username + password, Laravel cookie sessions (`remember` on) with CSRF via the
  `XSRF-TOKEN` cookie / `X-XSRF-TOKEN` header. `src/lib/api.ts` is the only HTTP client.
- Routes: `backend/routes/api.php`. Authorization lives in Laravel: `CharacterPolicy`
  (owner or admin) and the `admin` gate (`can:admin` routes).
- Schema: `backend/database/migrations/` is authoritative. Tables: `users` (username,
  password, role), `characters`, `game_data`, `exalt_types`, `charm_library` plus its
  child lists (`charm_abilities`, `charm_modes`, `charm_mode_prerequisite_abilities`,
  `charm_prerequisite_abilities`, `charm_prerequisite_charms`, `charm_choice_options`,
  `charm_target_options`, `charm_essence_tiers`). Lists carry an explicit
  `position`/`sort_order`.
- `GET /api/charms` returns each charm with its lists nested under the child table's
  name — the same shape the app read from Supabase.
- Character sheets (`characters.data`) and game data are stored verbatim as JSON; the
  server never reinterprets them (`{}` and `[]` stay distinct).

### `data` JSON Structure (CharacterData type)
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
interface AuthContextType {
  user: { id: string; username: string; role: UserRole } | null
  username: string
  role: UserRole | null
  loading: boolean
  signIn, signUp, signOut, changeUsername, changePassword  // each → /api, resolves { error }
}
// On load it asks GET /api/me who is signed in (the session cookie decides).
```

## File Structure
```
src/
  App.tsx                        # Router + AuthProvider + ThemeProvider
  index.css                      # Global styles
  main.tsx
  lib/
    api.ts                       # fetch client for /api ({ data, error })
    charmPayload.ts              # body sent when creating/saving a library charm
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
    SheetTab.tsx                  # All 11 panels + defense calc + FoI + CharmPanel
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
backend/                         # Laravel API (routes/api.php, app/, database/migrations/)
deploy.sh                        # live folder only: backup, pull, build, migrate, reload
backup-db.sh                     # gzipped mysqldump to ~/backups/exalted (also run by cron)
supabase/                        # old Postgres schema — historical record only
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
- **Change Username modal**: `PUT /api/me/username` (lowercased, unique)
- **Password modal**: Current / New / Confirm fields, each with inline eye-icon toggle; `PUT /api/me/password` checks the current password on the server
- **Appearance**: light/dark toggle via `ThemeContext` (persisted to `localStorage`)

### SetupPage (`/setup`) — "Admin" in UI
Admin only. Left sidebar tabs: Tables | Charms | Users.
- **Tables**: Weapons, Armor, Equipment Tags, Essence Motes, Anima States, Exalt Types — all editable, saved to `game_data` (except Exalt Types which go to `exalt_types` table)
- **Charms**: add/edit/delete `charm_library` rows; grouped by ability
- **Users**: all users + characters; role dropdown (locked for self); Delete user (locked for self); per-character Move and Delete. The server enforces the same locks.

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
- Character data: full `CharacterData` → `PUT /api/characters/{id}`
- GameData: `PUT /api/game-data` (one row per user)
- "Saving…" shown in header while in progress

## Known Quirks
- `InventoryItem.tags` was `string` in older saved data — `normTags()` handles backward compat
- Saved layouts missing entries for new panels are auto-merged from DEFAULT_LAYOUT on load
- Light mode toggle exists but app colors are all hardcoded stone/amber — a CSS variable theming pass is needed to make it visually functional
