# Scope

## Purpose
A personal interactive character sheet web app for the tabletop RPG **Exalted** (a custom/modified version of the game). Built for a single primary user (Angel) with the architecture to support multiple users in the future.

## What This App Is
- A living, persistent character sheet that replaces paper sheets
- Accessible from any PC or mobile browser
- All data is stored in the cloud — no local-only state
- Multi-character support: the user can create and manage multiple characters

## How It Is Viewed
- The app is accessed via browser at https://exalted-character-app.vercel.app
- Login is required (email + password)
- After login the user lands on a character list page
- Selecting a character opens the character page with 4 tabs:
  1. **Character Sheet** — the main stats, attributes, abilities, defenses, etc.
  2. **Milestones** — XP tracking log
  3. **Notes** — free-form text
  4. **Characters** — NPC/character met log with notes per entry

## Design Philosophy
- Dark theme (stone/amber color palette)
- Compact and information-dense — minimize scrolling
- The character sheet uses a grid layout (64-unit system) with panels placed in columns
- The layout will eventually be user-configurable (drag-and-drop panels, resize) — this is planned but not yet implemented
- No unnecessary chrome — clean, functional, no bloat

## What Is NOT In Scope (Yet)
- PWA / native mobile app
- Real-time collaboration / multiplayer
- Drag-and-drop layout editor (planned next)
- Dice roller
- Any game automation or rules enforcement — this is purely a reference/tracking sheet
