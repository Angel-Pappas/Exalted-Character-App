# Exalted Character App

A web character sheet for a custom version of the Exalted tabletop RPG, live at
https://exalted.pappas.yoltobots.click.

- `src/` — the React 19 + Vite + TypeScript + Tailwind front end.
- `backend/` — the Laravel 13 API it talks to (`/api`), on MySQL.
- `npm run check` — every check: TypeScript, ESLint, Vitest, then the backend's
  Pint, Larastan and Pest.
- `deploy.sh` / `backup-db.sh` — deploy to the VM (live folder only) and back up
  the database.

Working rules for this repo are in `CLAUDE.md`; the full project background is in
`info/` (start with `info/SESSION_SUMMARY.md`).
