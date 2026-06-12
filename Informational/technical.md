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
- Database: single `characters` table with Row Level Security (users see only their own characters)

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

### `data` JSONB Structure (CharacterData type)
```ts
{
  sheet: {
    attributes: Record<string, number>,       // e.g. { "Strength": 4 }
    abilities: Record<string, {               // keyed by ability name
      rating: number,
      specialty: string,
      excellency: boolean
    }>,
    defenses: Record<string, number>,         // Parry, Evasion, Soak, Hardness, Resolve
    languages: string[],
    merits: { id, type: 'Primary'|'Secondary'|'Tertiary', name }[],
    intimacies: { id, intensity: 'Minor'|'Major'|'Defining', description }[],
    motes: { current: number, committed: number, total: number },
    health: { penalty: string, checked: boolean }[],
    layout: { i: string, x: number, y: number, w: number, h: number }[]
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
  npcs: { id, name, description }[]
}
```

## File Structure
```
src/
  App.tsx                        # Router + AuthProvider
  index.css                      # Global styles (Tailwind import, spinner removal)
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
    CharacterListPage.tsx         # Create/select/delete characters
    CharacterPage.tsx             # Main character view with tabs + auto-save
  tabs/
    SheetTab.tsx                  # Character sheet (grid layout)
    MilestonesTab.tsx             # XP tracking
    NotesTab.tsx                  # Free-form notes
    CharactersTab.tsx             # NPC/character log
  types/
    character.ts                  # All TypeScript interfaces
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
- Uses `react-grid-layout` and `react-resizable` for drag-and-drop panel layout
- 64-column grid, row height = 10px, margins = 6px
- 8 independent panels: `attributes`, `abilities`, `defenses`, `motes`, `health`, `merits`, `languages`, `intimacies`
- Default layout places panels in 3 column groups (widths ~8, 8, 14 cols) with the rest reserved
- Layout is stored in `SheetData.layout: PanelLayout[]` and saved to Supabase via auto-save
- **Edit mode toggle** (top-right button): when ON, panels are draggable/resizable with an amber drag handle bar at the top; grid lines are shown as a faint amber crosshatch background. When OFF, layout is locked and handles are hidden.
- `draggableHandle=".drag-handle"` — only the top handle bar triggers dragging in edit mode

### PanelLayout type (in character.ts)
```ts
interface PanelLayout { i: string; x: number; y: number; w: number; h: number }
```

## Auto-save
- Triggered 1 second after any data change (debounced `setTimeout`)
- Saves full `CharacterData` to Supabase `characters.data` JSONB column
- Shows "Saving…" in header while in progress, disappears when done

## Known Quirks
- GitHub repo must be **public** — Vercel free (Hobby) plan blocks deploys from private repos by non-owner committers
- Git user email must be `ange.pap@hotmail.com` to match the GitHub account linked to Vercel
- Number inputs have spinners removed globally via CSS in `index.css`
