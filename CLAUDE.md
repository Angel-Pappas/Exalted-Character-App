# Standing directions for this repo

Read `info/SESSION_SUMMARY.md` first for full context (game rules, DB schema, file structure). This file is the short version that must never be missed.

## Angel's standing quality directive — applies to every session, permanently
Stated 2026-07-16, and it does not expire:
> "I want the code pristine and proper as per the best practices of programming. Everything neat and tidy, run all proper checks, always, and make sure no errors are returned. Make sure the entire code is flawless but still works as intended."

**Angel is not a developer and cannot personally review the code.** That is the whole point of this directive — he is delegating judgement, not just typing. It raises the bar in both directions:

- **`npm run check` must pass before every push. No exceptions.** It runs `tsc -b`, `eslint .`, and `vitest run`. Zero errors, zero lint problems, zero failing tests. Never push on the assumption that a change is "too small to break anything."
- **Never report a check you did not run, and never trust a green result you did not sanity-check.** This has already gone wrong here: a lint "pass" once came from comparing two empty files, and a `tsc: 1` was really grep's exit code. If a suite goes quiet after a config change, plant a deliberate violation and confirm it still fails. A check that cannot fail is decoration.
- **Because he cannot review the diff, "it compiles" is not evidence it is correct.** Behaviour-changing work needs a real argument for why it is safe, or a test that proves it. If something genuinely can't be verified without running it, say so plainly and name the risk — do not let it pass silently.
- **Do not do sweeping rewrites.** The request for flawless code is not a licence for one giant refactor. There is no reviewer and no runtime verification, so a mass rewrite is unverifiable by construction. Work in slices small enough to reason about, each landing green.
- **Tests come before the refactor they protect, not after.** Extract pure logic into `src/lib/*`, test it, then change it.
- **"Best practice" is a means, not the goal.** Working software is the goal. A rule that buys this project nothing (e.g. dev-server-only lint rules) gets turned off in config with a written reason — not obeyed by contorting code, and not left failing. Say so plainly rather than quietly complying.

## Breakdown tooltips — one line per source (Angel, 2026-09-27)
Every "where does this number come from" tooltip (Defenses today, any future ones) lists:
1. **Base** — only the book formula, with its maths explained. Never fold a bonus into Base's text.
2. **Item bonuses** (weapon, armor).
3. **Every other source on its own line** (e.g. "Ox Body +1"), whenever a new charm/merit/effect adds to the number.
4. **Manual bonus** — always last, labelled exactly "Manual bonus".

## Moving off Vercel + Supabase — status (started 2026-10-01)
Angel's plan, in order. **Do not skip ahead of a checkpoint.**
1. ✅ Rebuild on the VM: Laravel 13 API (`backend/`) + MySQL, React front end unchanged
   apart from the API calls. Game content (charm library, exalt types) copied in.
2. ⏸ **Checkpoint — Angel checks https://exalted.pappas.yoltobots.click** (no users or
   characters yet; he signs up a throwaway account to try it).
3. Copy users (with their existing passwords), characters and game data from Supabase
   into MySQL. Needs Angel's go-ahead: reading password hashes from Supabase is gated.
   `App\Support\SupabasePassword` relabels Supabase's `$2a$` bcrypt hashes for Laravel.
4. Then Angel decides what happens to the old Vercel + Supabase app.

Until the cutover the work lives on the **`laravel` branch**; `main` is still the old
Vercel app, which auto-deploys from `main`. **Before merging `laravel` into `main`,
the Vercel project must be frozen** (Ignored Build Step = "don't build", or disconnect
its Git repo) — Claude was not permitted to change it, so ask Angel to do it or to
approve it. After the merge, work moves to `main` and this section can be trimmed.

**Report to Angel once the move is done (he asked):** the old Supabase database lets any
signed-in player promote themselves to admin (its `user_profiles` update policy has no
check on `role`). The new Laravel app closes this by design and has a test for it
(`AdminTest`: "gives a player no way to make themselves admin"). Angel chose not to patch
the old app; whatever remains is to be fixed in the new setup.

## Workflow on the VM — two folders, never mix them up
- **`/home/ploi/exalted-dev`** — the **dev checkout**. All editing, building and testing
  happens here, on SQLite (`backend/database/database.sqlite`). Its `.env` cannot reach
  the live MySQL.
- **`/home/ploi/exalted.pappas.yoltobots.click`** — the **live app** nginx serves. Never
  edit, build or run tests there. It changes **only** through `./deploy.sh`, which backs
  up MySQL first (`backup-db.sh` → `~/backups/exalted/`, aborts the deploy if the backup
  fails), then pulls, installs, builds, migrates and reloads php-fpm. `deploy.sh` refuses
  to run unless `backend/.env` is the production config.
- A change goes: edit in dev → `npm run check` → commit + push → `./deploy.sh` in the
  live folder. Nothing deploys on push by itself. GitHub Actions (`checks.yml`) runs the
  same `npm run check` on every push — keep it green.
- **The live database holds everyone's characters and must never be lost.** Never run
  tests, `migrate:fresh`/`db:wipe`/`migrate:rollback`, or ad-hoc writes against it.
  `backend/tests/TestCase.php` refuses to boot tests on anything but in-memory SQLite —
  keep that guard. Production `APP_ENV` also blocks Laravel's destructive commands.
  Any migration that drops or rewrites data is raised with Angel before it ships.

## Git workflow — do not ask
- **Always commit, push and deploy immediately after every code change.** Do not ask for confirmation first. This is a standing, pre-authorized exception to the general "confirm before pushing" default.
- Never prompt for permission for anything **except**: permanently deleting DB data, or changing a user's admin access. Everything else — commits, pushes, deploys, edits, non-destructive migrations — just do it.

## Verification — do not spin up a local dev server
- Angel does not run a local dev server. He reviews every change on the live site, https://exalted.pappas.yoltobots.click, after `./deploy.sh`.
- Verify changes with `npm run check` and by reading the code path, not by launching `npm run dev` or creating throwaway accounts in the live database. Backend behaviour is verified with Pest feature tests. If something genuinely can't be trusted without running it, say so plainly instead of defaulting to local browser testing.

## Lint must stay at zero — check before every push
- **`npm run check` must be clean before any push.** It runs `tsc -b`, `eslint .`, `vitest run`, then the backend's `composer test` (Pint formatting, Larastan level 7, Pest). It is cheap; it is not optional.
- The baseline was cleaned to zero on 2026-07-15. **Never let problems accumulate again.** A nonzero baseline is not a cosmetic debt — it destroys the ability to tell whether *this* change added anything, which is the whole point of running the tool. Do not report "N pre-existing problems, none of them mine" as if that were verification; it isn't, and counting totals hides an added error that coincides with a removed one.
- If a rule genuinely doesn't fit this project, **turn it off in config (`eslint.config.js`, `backend/phpstan.neon`, `backend/pint.json`) with a written reason** — a deliberate, documented decision. Do not leave it failing, and do not contort working code to satisfy a rule whose benefit this project never consumes (e.g. `react-refresh/only-export-components`, which only pays off in a dev server that isn't used here).
- Inline `eslint-disable` (or `@phpstan-ignore`) is allowed **only** with a comment saying why the rule is wrong in that spot (e.g. a ref-guarded once-only effect that exhaustive-deps can't see through). Never a bare suppression.
- A green result proves nothing if the tool isn't running. If a check suddenly goes quiet after config changes, confirm it still catches a planted violation.
- Not wired into `deploy.sh` on purpose: a style nit should never block a deploy Angel needs live. Enforcement is this rule plus CI.

## Repo facts
- Dev checkout `/home/ploi/exalted-dev`; live folder `/home/ploi/exalted.pappas.yoltobots.click` (VM user `ploi`).
- Live app: https://exalted.pappas.yoltobots.click (nginx site `exalted.pappas.yoltobots.click`; `/api/*` → `backend/public/index.php` on php8.5-fpm, everything else → `dist/`).
- MySQL 8.4 on the VM: database `exalted`, user `exalted`; credentials only in the live `backend/.env`.
- The VM pushes to GitHub over HTTPS through the `gh` CLI's token — don't switch the remote to `git@github.com:`.
- Git identity: `ange.pap@hotmail.com`. The repo is public; that was a Vercel free-tier requirement, so it may go private once Vercel is retired (Angel's call).
