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

## Git workflow — do not ask
- **Always `git commit` and `git push` immediately after every code change.** Do not ask for confirmation first. This is a standing, pre-authorized exception to the general "confirm before pushing" default.
- Never prompt for permission for anything **except**: permanently deleting DB data, or changing a user's admin access. Everything else — commits, pushes, edits, non-destructive migrations — just do it.

## Verification — do not spin up a local dev server
- Angel does not run a local dev server. He reviews every change on the live Vercel URL (auto-deploys on push to `main`).
- Verify changes via `npx tsc -b` and by reading the code path, not by launching `npm run dev` or creating throwaway test accounts. If something genuinely can't be trusted without running it, say so plainly instead of defaulting to local browser testing.

## Lint must stay at zero — check before every push
- **`npm run check` (tsc + lint + tests) must be clean before any push.** It is cheap; it is not optional.
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
