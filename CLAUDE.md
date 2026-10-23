# Standing directions for this repo

**The shared ways of working in `~/.claude/CLAUDE.md` apply here in full** (quality
directive, design principles, screenshots, docs pattern, ship workflow, safety,
efficiency). This file holds only what is specific to the Exalted app. How it works
now: **`Summary.md`** (auto-loaded below); what changed and why: **`History.md`**;
what's next: **`ROADMAP.md`**; deeper reference: `info/`.

## Exalted-app rules

- The full check is **`npm run check`**: `tsc -b`, `eslint .`, `vitest run`, then the
  backend's `composer test` (Pint, Larastan level 7, Pest). Keep it at **zero**
  problems — the baseline was cleaned on 2026-07-15; a nonzero baseline hides whether
  _this_ change added anything.
- A rule that doesn't fit is turned off in `eslint.config.js`, `backend/phpstan.neon`
  or `backend/pint.json` with a written reason (e.g. `react-refresh/only-export-components`
  only pays off in a dev server); an inline `eslint-disable`/`@phpstan-ignore` needs a
  comment saying why.
- Pure front-end logic lives in `src/lib/*` with a Vitest test beside it.

## Breakdown tooltips — one line per source (Angel, 2026-09-27)
Every "where does this number come from" tooltip (Defenses today, any future ones) lists:
1. **Base** — only the book formula, with its maths explained. Never fold a bonus into Base's text.
2. **Item bonuses** (weapon, armor).
3. **Every other source on its own line** (e.g. "Ox Body +1"), whenever a new charm/merit/effect adds to the number.
4. **Manual bonus** — always last, labelled exactly "Manual bonus".

## History of the stack (done 2026-10-01)

The app runs only on our VM: Laravel 13 API (`backend/`) + MySQL, React front end. All
accounts (with their passwords — `App\Support\SupabasePassword` relabels Supabase's
`$2a$` bcrypt hashes), characters and game content were copied from Supabase and
verified identical. Angel deleted the Vercel and Supabase projects on 2026-10-01 —
the VM and its MySQL backups (`~/backups/exalted/`) are the only copies. Keep
`SupabasePassword`; the import commands can no longer reach a source.

## Workflow — two folders, never mix them up

- **`/home/ploi/exalted-dev`** — dev checkout. All editing, building and testing, on
  SQLite (`backend/database/database.sqlite`, which holds a copy of the game content
  — no migration recreates it, so **never `migrate:fresh` it**). Its `.env` cannot
  reach the live MySQL.
- **`/home/ploi/exalted.pappas.yoltobots.click`** — the live app nginx serves. Changes
  **only** through `./deploy.sh` (refuses to run unless `backend/.env` is production;
  backs up MySQL to `~/backups/exalted/` first, aborting if that fails; migrates
  before building). Nightly backup at 03:45 from the `ploi` crontab.
- **Ship** a finished change from the dev folder with `./ship.sh "Subject"` — Pint →
  build → `npm run check` → commit + push → waits for CI (`checks.yml`) → deploy.
- **Look before shipping:** `(cd backend && php artisan db:seed --class=DemoSeeder)`
  adds a `demo` / `password` admin with a "Demo Solar" character (it only adds, never
  wipes); `npm run build`; then `npm run shots -- / /characters "/character/<id>"`
  (`--mobile`, `--light` = the app's light theme, `--wide` = Angel's 2560px desktop, full page, `--width=2048` = any window width, full page (2048 = a 2560 screen at 125% scaling), `--full` = full page at any size, `--click=Milestones`
  clicks that button and `--fill=Placeholder=text` types into that field, `--hover=Text` rests the pointer on it, `--type=text` types at the cursor, first, in the
  order given; the `--` stops
  npm from swallowing those flags) → PNGs in `backend/storage/screenshots/`. The script serves
  `dist/` and forwards `/api` to `php artisan serve`, like nginx does live.
  `playwright-core` is pinned to 1.63.0 to use the Chromium already cached on the VM.
- **The live database holds everyone's characters and must never be lost.**
  `backend/tests/TestCase.php` refuses to boot on anything but in-memory SQLite — keep
  that guard. Ask Angel before permanently deleting data or changing a user's admin
  access.

## Repo facts
- Dev checkout `/home/ploi/exalted-dev`; live folder `/home/ploi/exalted.pappas.yoltobots.click` (VM user `ploi`).
- Live app: https://exalted.pappas.yoltobots.click (nginx site `exalted.pappas.yoltobots.click`; `/api/*` → `backend/public/index.php` on php8.5-fpm, everything else → `dist/`).
- MySQL 8.4 on the VM: database `exalted`, user `exalted`; credentials only in the live `backend/.env`.
- The VM pushes to GitHub over HTTPS through the `gh` CLI's token — don't switch the remote to `git@github.com:`.
- Git identity: `ange.pap@hotmail.com`. The repo is public; that was a Vercel free-tier requirement, so it may go private once Vercel is retired (Angel's call).

## Current state (auto-loaded)

@Summary.md
