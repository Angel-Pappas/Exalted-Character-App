# Session Summary — Exalted Character App

Read this file at the start of every session to restore context. For full detail on any topic, read the corresponding file in this folder.

---

## What This App Is
A web-based interactive character sheet for a **custom version of the Exalted tabletop RPG**. Built for Angel and his co-players. Live at https://exalted.pappas.yoltobots.click.

- Stack: React 19 + Vite 8 + TypeScript + Tailwind CSS v4 front end; Laravel 13 API (`backend/`) + MySQL 8.4; all on our own VM (nginx + php8.5-fpm). Moved off Vercel + Supabase in October 2026.
- Repo: https://github.com/Angel-Pappas/Exalted-Character-App
- Dev checkout: `/home/ploi/exalted-dev`. Live folder: `/home/ploi/exalted.pappas.yoltobots.click` (changed only by `./deploy.sh`). See `CLAUDE.md` for the workflow.
- Angel reviews on the live URL — does not run a local dev server
- **Always commit, push and deploy after every code change** — no need to ask

---

## Users & Roles
- Two roles: `admin` and `player`, in `users.role`. New signups always get `player`.
- **Auth is username + password only — no emails.** Laravel cookie sessions. Usernames are stored lowercase; the old Supabase form `username@exalted.local` still signs in. The login page shows only "Username" and "Password" fields.
- Angel's username: `angel`, UUID `c5d208d8-3d47-4dc3-b76b-c211d8486c3b`, role `admin`
- `AuthContext` exposes `user`, `username` and `role: 'admin' | 'player' | null`
- New accounts are active immediately
- Admin can manage users (role change, delete) via Admin → Users tab
- **Failsafes (enforced by the server):** can't change your own role or delete yourself — so the last admin can never be removed

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
- Change Username saves through `PUT /api/me/username`.

**SetupPage** (`/setup`, called "Admin" in UI): left sidebar tabs → Tables | Charms | Users.
- **Tables**: editable Weapons/Armor/Tags/EssenceMotes/AnimaStates + Exalt Types
- **Charms**: global charm library CRUD
- **Users**: list of all users with username, role dropdown, character count, expandable character list. Per-character: Move (reassign to another user) and Delete (✕). Per-user: Delete button (hidden for self). Role dropdown locked for self.

---

## Database (MySQL, via the Laravel API)
| Table | Purpose |
|---|---|
| `users` | username, password hash, `role` (`admin`/`player`) |
| `characters` | Per-user characters; `data` JSON holds all CharacterData, stored verbatim |
| `game_data` | Per-user reference tables (weapons, armor, tags, essence motes, anima states) |
| `charm_library` (+ child list tables) | Global charm list; everyone reads, admins write |
| `exalt_types` | Global exalt types with caste label and castes (10 seeded) |

The schema is `backend/database/migrations/`. Who may do what is enforced in Laravel
(`CharacterPolicy`: owner or admin; `can:admin` routes for admin tools) and covered by
Pest tests in `backend/tests/Feature/`.

---

## Character Sheet
11 draggable/resizable panels on a 128-column grid. Layout saved per character in the database.

The **Essence** panel holds every pool in one box: an Essence | Anima row on top,
then Motes (Current | Committed), then a Power | Will row. Power and Will are 0–10; Essence is 1–5 and has no reset
(it is a permanent trait, not a per-scene pool). All three look and behave like Anima
minus its state label and color ramp. The panel has no title of its own — the counter
row's labels serve as one.

Older layouts are migrated on load and the rest of the column reflows to match: sheets
with separate `motes`/`anima` panels get them folded in, and an Essence box still at the
old `LEGACY_ESSENCE_H` is resized to `ESSENCE_H`. Any other height is player-chosen and
left alone.
All panels are scrollable with hidden scrollbars (`overflow-y-auto no-scrollbar h-full`).

### Identity
Each character has: name, exalt type (from `exalt_types` table), caste/aspect. Set at creation and not editable on the sheet. Shown in the CharacterPage header next to the name as `Type · Caste` — bare values, no "Exalt Type"/"Caste" labels, matching the CharactersPage subtitle.

### Attributes (9 total)
Physical: Strength, Dexterity, Stamina — Social: Charisma, Manipulation, Appearance — Mental: Perception, Intelligence, Wits

> **Important:** The book says "highest appropriate attribute" in many places. This app uses 9 fixed attributes with each stat mapped to a specific one. **Ignore "highest attribute" wording from any book quotes.**

### Abilities (14)
Athletics, Awareness, Close Combat, Craft, Embassy, Integrity, Navigate, Performance, Physique, Presence, Ranged Combat, Sagacity, Stealth, War

### Defense Calculations (all auto-calculated)
Maths in `src/lib/defenses.ts`, pinned by `src/lib/defenses.test.ts`, which quotes the book.
```
Parry    = ceil((Stamina + Close Combat) / 2) + wpnBonus + defenseBonus.parry
Evasion  = ceil((Dexterity + Athletics) / 2) + wpnBonus + defenseBonus.evasion
Soak     = 1 + (Physique >= 3 ? 1 : 0) + bestArmorSoak + defenseBonus.soak
Hardness = 2 + Essence + bestArmorHardness + defenseBonus.hardness
Resolve  = (Integrity >= 3 ? 4 : Integrity >= 1 ? 3 : 2) + defenseBonus.resolve

wpnBonus = highest defense value among equipped weapons, ONLY when Full Defense OR Defend Other is active

The Dice Limit applies to all five (they are static values):
  value = base + min(5, gearBonus) + manualBonus,  floored at 1 if a penalty pushed it under
  gearBonus = armour Soak/Hardness, or weapon Defense on Parry/Evasion
  the manual bonus box is EXEMPT from the cap (Angel's call — it's an override)
```
**Soak uses Physique, not Stamina. Resolve does not use Wits.** These three read wrong in
this file until 2026-07-16 — the old text was a guess that never matched the book or the
code. See `info/context.md` for the book wording verbatim. If code and book disagree, the
book wins; never "fix" the code to match a paraphrase.

Only one armor can be equipped at a time (equipping one auto-unequips others).

### Charms
- Global library in `charm_library` (admin manages via Admin → Charms)
- Players browse the library and add charms to their sheet as `CharacterCharm[]`
- The Charms panel shows charms as fixed-width (10rem) cards that always show their full text, modes and choices (nothing to click open), in player-made groups that sit side by side, each three cards wide, wrapping when the panel runs out of width. Each card's corner has ✎ edit ("revert to original" shows only while editing), ⚙ implementation (lit = implemented and on; grey = off or no implementation) and ✕ remove. Groups (`SheetData.charmGroups`, per character, never premade). A charm sits in at most one group (`CharacterCharm.groupId`; absent = Ungrouped). Deleting a group ungroups its charms, never deletes them. Groups have a name and colour only. Cards and groups move and reorder by drag and drop only (off in layout-edit mode). Logic in `src/lib/charmGroups.ts` (tested).
- Each CharacterCharm: `libraryId`, `name`, `libraryMechanicalKey` (denormalized), `customDescription` (player override), `mechanicalKeyOverride`, `mechanicalEnabled`
- Effective mechanical key = `mechanicalKeyOverride ?? libraryMechanicalKey`
- `mechanicalEnabled` gates whether coded features are active
- Custom descriptions override library text per character; can be reverted

### Fists of Iron Technique (FoI)
- FoI button only appears if a charm with effective key `'foi'` exists AND `mechanicalEnabled = true`
- Opens modal: choose weight + tag + artifact toggle
- Tag effects: Shield→−1 dmg, Balanced→+1 ovw, Improvised→−2 acc, Defensive→+1 def
- FoI state (`foi` + `foiOriginals`) is **persisted in SheetData** (survives refresh)

### Health track and Ox Body Technique
- Damage is one number (`SheetData.damage`), filled left to right; the track itself is rebuilt each render from the starting seven plus Ox Body levels (`src/lib/health.ts`, tested)
- Ox Body is recognised by mechanical key `ox_body` (+ implementation on): +1 base Soak once (`defenses.ts`), and per-purchase health levels by Exalt type; Solar/Abyssal/Janest choose per purchase (`CharacterCharm.oxBodyPicks`)

### Inventory
- Flat `InventoryItem[]`, rendered as Weapons → Armor → Other
- Weapons: accuracy, damage, defense, overwhelming; artifact toggle (+1 all stats); tags
- Armor: soak, mobilityPenalty, hardness; artifact toggle (+1 soak+hardness); single equip rule
- Stats auto-filled from GameData reference tables in modal

---

## Key Rules for Development
1. **All state that should survive a refresh or session gap goes to the database through the API** — never use local React state for persistent data
2. **Always commit, push and deploy after every code change** — no need to ask
3. Ignore "highest appropriate attribute" from book quotes — each stat has a fixed attribute mapping
4. Light mode toggle exists in Settings but CSS is not wired up yet (all colors are hardcoded stone/amber)
5. **Never prompt for permission** except before permanently deleting DB data or changing admin access
6. **Tooltips on the sheet use `data-tip="…"`, never `title=`** — `src/components/Tooltip.tsx` renders them above every panel and keeps them in the window. Rich content (the Defenses breakdown) uses `<Tooltip content={…}>`. Icon-only buttons also need `aria-label`, since the hint no longer names them.

---

## File Structure (key files)
```
src/
  App.tsx                  # Router: / → HomePage, /characters → CharactersPage, /character/:id, /options, /setup
  contexts/
    AuthContext.tsx         # user, username, role, signIn/Up/Out, changeUsername/Password
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
  lib/api.ts                # the only HTTP client: /api on the same origin
backend/                    # Laravel API — routes/api.php, app/, database/migrations/ (the schema)
deploy.sh, backup-db.sh     # live-folder deploy (backs up MySQL first) and nightly backup
supabase/                   # old Postgres schema — historical record only
```

---

## Current State
Running on our VM since 2026-10-01 (Laravel + MySQL), with all data moved over from
Supabase: accounts `angel` (admin) and `angeltest` (player), with their passwords, and
their characters. The old Vercel + Supabase app is frozen and unused (see `CLAUDE.md`).
Admin panel covers Tables, Charms, and Users management.

Next up: light mode CSS theming pass, charm-by-charm mechanical implementations as needed.
