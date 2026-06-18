# Scope

## Purpose
A personal interactive character sheet web app for the tabletop RPG **Exalted** (a custom/modified version of the game). Built initially for Angel as solo player, with the architecture to support the full co-player group joining over time.

## What This App Is
- A living, persistent character sheet that replaces paper sheets
- Accessible from any PC or mobile browser
- All data is stored in the cloud — no local-only state (state must survive refresh and week-long gaps between sessions)
- Multi-character support: any user can create and manage multiple characters
- **Global charm library** maintained by the admin (Angel), browseable and addable to any character by any player
- **Settings page** for per-user preferences (theme, account details)
- **Admin page** (admin only) for configuring shared game reference tables, the charm library, and managing users

## How It Is Viewed
- The app is accessed via browser at https://exalted-character-app.vercel.app
- Login is required (username + password — no email involved)
- After login the user lands on the **Home hub page** with cards for Characters, Settings, and Admin (admin only)
- Selecting Characters opens the character list; selecting a character opens the character page with 4 tabs:
  1. **Character Sheet** — the main stats, attributes, abilities, defenses, etc.
  2. **Milestones** — XP tracking log
  3. **Notes** — free-form text
  4. **Characters** — NPC/character met log with notes per entry
- **Settings** card opens `/options` — per-user preferences
- **Admin** card (admin only) opens `/setup` — game reference tables, charm library, user management

## User Roles
- **Admin** (Angel): can manage the charm library, edit reference tables, manage users, access `/setup`
- **Player**: can browse the charm library, add charms to their sheet, customize charm descriptions per character; cannot modify the library, reference tables, or user accounts
- New accounts auto-get `player` role. Admin role is assigned by an existing admin via the Admin → Users tab.
- **Failsafes**: admins cannot demote themselves or the last remaining admin; cannot delete their own account

## Auth System
- Username + password only — no real emails, no email confirmation
- Supabase stores accounts internally as `username@exalted.local`
- New accounts are created by admins or via the Create Account form on the login page
- Admin can delete users and move characters between accounts via the Admin → Users tab

## Design Philosophy
- Dark theme (stone/amber color palette)
- Compact and information-dense — minimize scrolling
- The character sheet uses a grid layout (128-column system) with panels placed in columns
- The layout is user-configurable: panels can be dragged and resized in "Edit Layout" mode; layout is saved per character
- No unnecessary chrome — clean, functional, no bloat
- Game mechanics are assisted (auto-fill stats from reference tables, calculated defenses, tag effects applied automatically) but not enforced — the user can override anything
- **All persistent state goes to Supabase** — never use local React state for anything that should survive a refresh or session gap

## What Is NOT In Scope (Yet)
- PWA / native mobile app
- Real-time collaboration / multiplayer sync
- Dice roller
- Full light mode (toggle exists, CSS theming pass not yet done)
- Any game automation or rules enforcement beyond stat auto-fill and defense calculations
