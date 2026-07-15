# Session Summary — Exalted Character App

Read this file at the start of every session to restore context. For full detail on any topic, read the corresponding file in this folder.

---

## What This App Is
A cloud-based interactive character sheet for a **custom version of the Exalted tabletop RPG**. Built for Angel and his co-players. Live at https://exalted-character-app.vercel.app.

- Stack: React 19 + Vite 8 + TypeScript + Tailwind CSS v4 + Supabase + Vercel
- Repo: https://github.com/Angel-Pappas/Exalted-Character-App (must stay **public**)
- Working dir: `C:\Users\AngeP\Exalted-Character-App`
- Angel reviews on the live Vercel URL — does not run a local dev server
- **Always push immediately after every code change** — no need to ask

---

## Users & Roles
- Two roles: `admin` and `player`. Stored in `user_profiles` table. New signups auto-get `player`.
- **Auth is username + password only — no real emails.** Supabase stores accounts as `username@exalted.local` internally. The login page shows only "Username" and "Password" fields.
- Angel's username: `angel`, UUID `c5d208d8-3d47-4dc3-b76b-c211d8486c3b`, role `admin`
- `AuthContext` exposes `username` (derived from email by stripping `@exalted.local`) and `role: 'admin' | 'player' | null`
- Helper functions: `usernameToEmail(u)` → `u@exalted.local`, `emailToUsername(e)` → strips domain
- Email confirmation is **disabled** in Supabase — new accounts are active immediately
- Admin can manage users (role change, delete) via Admin → Users tab
- **Failsafes:** can't change your own role; can't demote the last admin

---

## Pages & Routes
| Route | Page | Who |
|---|---|---|
| `/` | HomePage (hub) | all |
| `/characters` | CharactersPage | all |
| `/character/:id` | CharacterPage | all |
| `/options` | SettingsPage | all |
| `/setup` | SetupPage (Admin) | admin only |
| `/login` | LoginPage | unauthenticated |

**HomePage** (`/`): hub with Cards — Characters, Settings, Admin (admin only). Sign Out button in header.

**CharactersPage** (`/characters`): list of the current user's characters with ExaltType·Caste subtitle. "+ New Character" button opens modal requiring all 3 fields (name, exalt type, caste/aspect) before enabling Create. Delete button on hover.

**SettingsPage** (`/options`): left sidebar → Account (username read-only with Change button, role read-only, Change Password modal with eye-icon fields + current-password re-auth) + Appearance (light/dark theme toggle).
- Display name has been removed — username is the only identity.
- Change Username updates auth email to `newname@exalted.local` via `supabase.auth.updateUser`.

**SetupPage** (`/setup`, called "Admin" in UI): left sidebar tabs → Tables | Charms | Users.
- **Tables**: editable Weapons/Armor/Tags/EssenceMotes/AnimaStates + Exalt Types
- **Charms**: global charm library CRUD
- **Users**: list of all users with username, role dropdown, character count, expandable character list. Per-character: Move (reassign to another user) and Delete (✕). Per-user: Delete button (hidden for self). Role dropdown locked for self and last admin.

---

## Supabase Tables
| Table | Purpose |
|---|---|
| `characters` | Per-user characters; `data` JSONB holds all CharacterData |
| `game_data` | Per-user reference tables (weapons, armor, tags, essence motes, anima states) |
| `user_profiles` | `user_id`, `role`, `username`; auto-created on signup via trigger |
| `charm_library` | Global charm list; public read, admin-only write |
| `exalt_types` | Global exalt type definitions with caste labels and caste lists |

### Key RLS Policies
- `user_profiles`: users read/update own row; admins (via `is_admin()` function) read/update all
- `characters`: users read/write own; admins read/update/delete all
- `is_admin()` is a `SECURITY DEFINER` function to avoid recursive RLS
- `delete_user(target_user_id)` is a `SECURITY DEFINER` RPC that deletes from `auth.users`

### user_profiles schema
```sql
user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('admin', 'player')),
  username text,   -- auto-populated from auth email (strips @exalted.local) on insert
  created_at timestamptz
)
```
Trigger `on_profile_created` (BEFORE INSERT, SECURITY DEFINER) sets `username` from auth email.

### exalt_types schema
```sql
exalt_types (
  id uuid primary key,
  name text,
  caste_label text check (caste_label in ('Caste', 'Aspect')),
  castes text[],
  sort_order integer
)
```
Seeded with all 10 exalt types. Managed by admin in Admin → Tables → Exalt Types.

---

## Character Sheet
11 draggable/resizable panels on a 128-column grid. Layout saved per character to Supabase.

The **Essence** panel holds Identity, Motes, Anima, Power and Will in one box. Power and
Will are plain 0–10 counters — same look and behavior as Anima, minus the state label and
color ramp. Older sheets that stored `motes`/`anima` as separate panels are migrated on
load: the Essence box grows to swallow them and panels below it shift down.
All panels are scrollable with hidden scrollbars (`overflow-y-auto no-scrollbar h-full`).

### Identity
Each character has: name, exalt type (from `exalt_types` table), caste/aspect. Set at creation, displayed read-only in the Essence panel (not editable on the sheet).

### Attributes (9 total)
Physical: Strength, Dexterity, Stamina — Social: Charisma, Manipulation, Appearance — Mental: Perception, Intelligence, Wits

> **Important:** The book says "highest appropriate attribute" in many places. This app uses 9 fixed attributes with each stat mapped to a specific one. **Ignore "highest attribute" wording from any book quotes.**

### Abilities (14)
Athletics, Awareness, Close Combat, Craft, Embassy, Integrity, Navigate, Performance, Physique, Presence, Ranged Combat, Sagacity, Stealth, War

### Defense Calculations (all auto-calculated)
```
Parry    = ceil((Stamina + Close Combat) / 2) + wpnBonus + defenseBonus.parry
Evasion  = ceil((Dexterity + Athletics) / 2) + wpnBonus + defenseBonus.evasion
Soak     = ceil(Stamina / 2) + bestArmorSoak + defenseBonus.soak
Hardness = Essence + bestArmorHardness + defenseBonus.hardness
Resolve  = ceil((Wits + Integrity) / 2) + defenseBonus.resolve

wpnBonus = highest defense value among equipped weapons, ONLY when Full Defense OR Defend Other is active
```
Only one armor can be equipped at a time (equipping one auto-unequips others).

### Charms
- Global library in `charm_library` (admin manages via Admin → Charms)
- Players browse the library and add charms to their sheet as `CharacterCharm[]`
- Each CharacterCharm: `libraryId`, `name`, `libraryMechanicalKey` (denormalized), `customDescription` (player override), `mechanicalKeyOverride`, `mechanicalEnabled`
- Effective mechanical key = `mechanicalKeyOverride ?? libraryMechanicalKey`
- `mechanicalEnabled` gates whether coded features are active
- Custom descriptions override library text per character; can be reverted

### Fists of Iron Technique (FoI)
- FoI button only appears if a charm with effective key `'foi'` exists AND `mechanicalEnabled = true`
- Opens modal: choose weight + tag + artifact toggle
- Tag effects: Shield→−1 dmg, Balanced→+1 ovw, Improvised→−2 acc, Defensive→+1 def
- FoI state (`foi` + `foiOriginals`) is **persisted in SheetData → Supabase** (survives refresh)

### Inventory
- Flat `InventoryItem[]`, rendered as Weapons → Armor → Other
- Weapons: accuracy, damage, defense, overwhelming; artifact toggle (+1 all stats); tags
- Armor: soak, mobilityPenalty, hardness; artifact toggle (+1 soak+hardness); single equip rule
- Stats auto-filled from GameData reference tables in modal

---

## Key Rules for Development
1. **All state that should survive a refresh or session gap goes to Supabase** — never use local React state for persistent data
2. **Always push after every code change** — no need to ask
3. Ignore "highest appropriate attribute" from book quotes — each stat has a fixed attribute mapping
4. Light mode toggle exists in Settings but CSS is not wired up yet (all colors are hardcoded stone/amber)
5. **Never prompt for permission** except before permanently deleting DB data or changing admin access

---

## File Structure (key files)
```
src/
  App.tsx                  # Router: / → HomePage, /characters → CharactersPage, /character/:id, /options, /setup
  contexts/
    AuthContext.tsx         # session, user, username, role, signIn, signUp, signOut
    ThemeContext.tsx        # theme: 'dark'|'light', persisted to localStorage
  pages/
    HomePage.tsx            # Hub: Characters, Settings, Admin (admin only) cards
    CharactersPage.tsx      # Character list + creation modal (all 3 fields required)
    CharacterPage.tsx
    SettingsPage.tsx        # /options — Account (username/password) + Appearance
    SetupPage.tsx           # /setup — Tables | Charms | Users tabs
    LoginPage.tsx           # Username + password only; eye-icon toggle on all password fields
  tabs/
    SheetTab.tsx            # All 11 panels + defense calculations + FoI + CharmPanel
  types/
    character.ts            # All interfaces + DEFAULT_GAME_DATA + ExaltType
info/
  SESSION_SUMMARY.md        # ← this file
  context.md                # Game rules, mechanics, full feature descriptions
  scope.md                  # Purpose, design philosophy, what's not in scope
  technical.md              # Stack, DB schemas, all types, file structure, code snippets
supabase/
  schema.sql                # Full DB schema
```

---

## Current State
Working and deployed. Angel is the only active user. Username-only auth is fully set up. Admin panel covers Tables, Charms, and Users management. The charm library needs to be populated via Admin → Charms before players can add charms to sheets.

Next up: light mode CSS theming pass, charm-by-charm mechanical implementations as needed.
