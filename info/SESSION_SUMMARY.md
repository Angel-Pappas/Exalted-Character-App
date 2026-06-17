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
- Angel's account: `angel.y.pappas@gmail.com`, UUID `c5d208d8-3d47-4dc3-b76b-c211d8486c3b`, role `admin`
- Admins: can write the charm library, access `/setup`, see "Setup" button in headers
- Players: can browse/add charms to their sheet, customize per-character; read-only on library
- `AuthContext` exposes `role: 'admin' | 'player' | null`, fetched from `user_profiles` on login

---

## Pages & Routes
| Route | Page | Who |
|---|---|---|
| `/` | CharacterListPage | all |
| `/character/:id` | CharacterPage | all |
| `/options` | SettingsPage | all |
| `/setup` | SetupPage | admin only |
| `/login` | LoginPage | unauthenticated |

**SettingsPage** (`/options`): left sidebar → Account (email/role read-only, editable username saved to `user_profiles.display_name`, Change Password modal with eye-icon fields + current-password re-auth) + Appearance (light/dark theme toggle via `ThemeContext`, persisted to localStorage).

**SetupPage** (`/setup`): tabs → Tables (editable Weapons/Armor/Tags/EssenceMotes/AnimaStates, saved to `game_data`) + Charms (global charm library CRUD, admin only).

Headers show **Settings** (all users) + **Setup** (admin only).

---

## Supabase Tables
| Table | Purpose |
|---|---|
| `characters` | Per-user characters; `data` JSONB holds all CharacterData |
| `game_data` | Per-user reference tables (weapons, armor, tags, essence motes, anima states) |
| `user_profiles` | `user_id`, `role`, `display_name`; auto-created on signup |
| `charm_library` | Global charm list; public read, admin-only write |

---

## Character Sheet
13 draggable/resizable panels on a 128-column grid. Layout saved per character to Supabase.

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

wpnBonus = highest defense value among equipped weapons, but ONLY when Full Defense OR Defend Other is active
```
Only one armor can be equipped at a time (equipping one auto-unequips others).

### Charms
- Global library in `charm_library` (admin manages via Setup → Charms)
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

---

## File Structure (key files)
```
src/
  App.tsx                  # Router + AuthProvider + ThemeProvider
  contexts/
    AuthContext.tsx         # session, user, role, signIn, signOut
    ThemeContext.tsx        # theme: 'dark'|'light', persisted to localStorage
  pages/
    SettingsPage.tsx        # /options — all users
    SetupPage.tsx           # /setup — admin only (renamed from OptionsPage)
    CharacterListPage.tsx
    CharacterPage.tsx
  tabs/
    SheetTab.tsx            # All 13 panels + defense calculations + FoI + CharmPanel
  types/
    character.ts            # All interfaces + DEFAULT_GAME_DATA
Informational/
  SESSION_SUMMARY.md        # ← this file
  context.md                # Game rules, mechanics, full feature descriptions
  scope.md                  # Purpose, design philosophy, what's not in scope
  technical.md              # Stack, DB schemas, all types, file structure, code snippets
supabase/
  schema.sql                # Full DB schema (run in Supabase SQL editor to recreate)
```

---

## Current State
Everything is working and deployed. Angel is the only active user currently. The charm library is empty — Angel needs to populate it via Setup → Charms before players can add charms to sheets.

Next up (no specific order): light mode CSS theming pass, charm-by-charm mechanical implementations as needed.
