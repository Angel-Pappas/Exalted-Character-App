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
- **Setup page** (admin only) for configuring shared game reference tables and the charm library

## How It Is Viewed
- The app is accessed via browser at https://exalted-character-app.vercel.app
- Login is required (email + password)
- After login the user lands on a character list page
- Selecting a character opens the character page with 4 tabs:
  1. **Character Sheet** — the main stats, attributes, abilities, defenses, etc.
  2. **Milestones** — XP tracking log
  3. **Notes** — free-form text
  4. **Characters** — NPC/character met log with notes per entry
- **Settings** link (in all headers) opens `/options` — per-user preferences
- **Setup** link (admin only, in all headers) opens `/setup` — game reference tables + charm library management

## User Roles
- **Admin** (Angel): can manage the charm library, edit reference tables, access `/setup`
- **Player**: can browse the charm library, add charms to their sheet, customize charm descriptions per character; cannot modify the library or reference tables
- New accounts auto-get `player` role. Admin role is assigned manually in the database.

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
