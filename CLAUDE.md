# Standing directions for this repo

Read `info/SESSION_SUMMARY.md` first for full context (game rules, DB schema, file structure). This file is the short version that must never be missed.

## Git workflow — do not ask
- **Always `git commit` and `git push` immediately after every code change.** Do not ask for confirmation first. This is a standing, pre-authorized exception to the general "confirm before pushing" default.
- Never prompt for permission for anything **except**: permanently deleting DB data, or changing a user's admin access. Everything else — commits, pushes, edits, non-destructive migrations — just do it.

## Verification — do not spin up a local dev server
- Angel does not run a local dev server. He reviews every change on the live Vercel URL (auto-deploys on push to `main`).
- Verify changes via `npx tsc -b` and by reading the code path, not by launching `npm run dev` or creating throwaway test accounts. If something genuinely can't be trusted without running it, say so plainly instead of defaulting to local browser testing.

## Lint must stay at zero — check before every push
- **`npm run lint` must report 0 problems before any push.** Run it every time, alongside `npx tsc -b`. Both are cheap; neither is optional.
- The baseline was cleaned to zero on 2026-07-15. **Never let problems accumulate again.** A nonzero baseline is not a cosmetic debt — it destroys the ability to tell whether *this* change added anything, which is the whole point of running the tool. Do not report "N pre-existing problems, none of them mine" as if that were verification; it isn't, and counting totals hides an added error that coincides with a removed one.
- If a rule genuinely doesn't fit this project, **turn it off in `eslint.config.js` with a written reason** — a deliberate, documented decision. Do not leave it failing, and do not contort working code to satisfy a rule whose benefit this project never consumes (e.g. `react-refresh/only-export-components`, which only pays off in a dev server that isn't used here).
- Inline `eslint-disable` is allowed **only** with a comment saying why the rule is wrong in that spot (e.g. a ref-guarded once-only effect that exhaustive-deps can't see through). Never a bare suppression.
- A green result proves nothing if the tool isn't running. If lint suddenly goes quiet after config changes, confirm it still catches a planted violation.
- Not wired into the Vercel build on purpose: a style nit should never block a deploy Angel needs live. Enforcement is this rule, not CI.

## Repo facts
- Working dir: `C:\Users\AngeP\Exalted-Character-App`
- GitHub repo must stay **public** (Vercel free-tier requirement)
- Git identity must be `ange.pap@hotmail.com` / `Angel-Pappas` to match Vercel's linked account
- Live app: https://exalted-character-app.vercel.app
