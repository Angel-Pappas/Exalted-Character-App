# Standing directions for this repo

Read `info/SESSION_SUMMARY.md` first for full context (game rules, DB schema, file structure). This file is the short version that must never be missed.

## Git workflow — do not ask
- **Always `git commit` and `git push` immediately after every code change.** Do not ask for confirmation first. This is a standing, pre-authorized exception to the general "confirm before pushing" default.
- Never prompt for permission for anything **except**: permanently deleting DB data, or changing a user's admin access. Everything else — commits, pushes, edits, non-destructive migrations — just do it.

## Verification — do not spin up a local dev server
- Angel does not run a local dev server. He reviews every change on the live Vercel URL (auto-deploys on push to `main`).
- Verify changes via `npx tsc -b` and by reading the code path, not by launching `npm run dev` or creating throwaway test accounts. If something genuinely can't be trusted without running it, say so plainly instead of defaulting to local browser testing.

## Repo facts
- Working dir: `C:\Users\AngeP\Exalted-Character-App`
- GitHub repo must stay **public** (Vercel free-tier requirement)
- Git identity must be `ange.pap@hotmail.com` / `Angel-Pappas` to match Vercel's linked account
- Live app: https://exalted-character-app.vercel.app
