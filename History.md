# History

One entry per shipped change, newest first: what changed and **why**. How things work
now is in `Summary.md`; plans in `ROADMAP.md`. Entries before 2026-10-15 were rebuilt
from the git history (one per day, its commits listed).

- **2026-10-22** — **Navigation that behaves like other web apps.** Angel: the Back
  button was clunky, a middle-click couldn't open Notes in one browser tab and the sheet
  in another, and the header scrolled away. Every page now has one header that stays at
  the top, with a breadcrumb trail of real links; every way to another page is a link;
  the character tabs have their own addresses, so Back, reloads and middle-clicks work;
  browser tabs show the page's name. Deleting a character from the list now asks for a
  second click (it used to delete at once). Buttons show the hand cursor; the keyboard
  focus is outlined; a save still waiting when the tab closes is sent before leaving.
- **2026-10-22** — **Free and Char. Creation are now marks on an Expense; Kaien's ledger
  corrected.** Angel checked Kaien's ledger against the sheet: a gift from the
  Storyteller had no honest way in (the only free option was Char. Creation). An
  Expense now has Free and Char. Creation toggles, so spending nothing is always a
  deliberate choice and the line's tag says which; the "+ Char. Creation" button is
  gone, and the charm payment prompt offers Free too. A migration converted every
  ledger, and fixed Kaien's at Angel's request: Racing Hare Method dropped (an upgrade
  costs nothing), one Arsenal-Summoning Gesture repurchase and Five-Direction Armaments
  dropped (the Solar mode is free; the charm has three paid lines), the missing Minor for
  Athletics 4→5 added, Presence Excellency marked Free, and every old description
  rewritten in today's format ("Charm (…)", "Athletics 3→4", "Specialty: …"). Angel had
  already deleted the two July lines (Awareness 3→4, Embassy 4→5) that never reached
  the sheet. The screenshot script's `--click` now also ticks a labelled checkbox.
- **2026-10-17** — **Every charm in the library implemented.** Angel asked for every charm
  without an implementation to be reviewed by the rules agreed for Kaien's, then built.
  All 484 were read: 231 need nothing (spent on a roll, a step or a question), 215 got
  settings (commit dots, in-use icons, purchase limits and choices), and 16 wait on 12
  questions (`CHARM_QUESTIONS.md`). New on the sheet: dots that come with a mode show
  only for characters who own it (an Exalt type's mode, an unlocked upgrade); charms in
  use now reach Parry, Evasion, Hardness and Resolve too (Mantis Form, Undying Body, Void
  Avatar…), can make Parry/Evasion use another Ability (Streaming Arrow Stance, Ebon
  Shadow Form), lower the wound penalty, or add temporary health levels; a charm with a
  limit above 1 can be rebought, and a choice can be asked only on the first purchase or
  only on the repurchase. Sharpshooter's Clever Tricks shows only the tricks picked. List:
  `info/charm-implementation.md`.
- **2026-10-16** — **Using charms on the sheet: commit dots, in-use icons and "!".** After
  reviewing Kaien's 22 charms with Angel (`info/kaien-charms-review.md`): charms that commit
  motes get dots that commit them as if by hand; charms with an ongoing effect get an
  in-use icon, and their sheet effects (Iron Kettle Body and Endurance of a Thousand Cuts
  on Soak) apply only while it's on; a charm over its purchase limit or missing a choice
  gets a "!". Righteous Lion Spirit, Unconquered Sun's Sight and Ward of the Sun ask for
  their choices. No Use buttons or cost tracking: Angel's table tracks those itself.
  Settings live per charm in Admin → Charms. Kaien's Arsenal-Summoning Gesture became ×3
  (the Dawn mode is a purchase in Angel's homebrew; his yes, T1).
- **2026-10-16** — **Phone layouts; ratings in training show today's value.** Angel
  asked for the sheet and Milestones page to be usable on a phone: the sheet's panels
  now stack in one column there, the header's tabs get their own row, and the
  Milestones page stacks with descriptions under each line's type, so nothing runs off
  the side. A rating with dots in training showed the value it would have after
  training, which Angel found confusing: it now shows today's value with the dashed
  outline, and hovering says what it goes to when done.
- **2026-10-16** — **Charm removal sticks, a steady Charms panel, and deleting ledger
  lines.** Angel couldn't remove Integrity-Protecting Principle: the line went, the charm
  came back. Cause: the sheet saved a whole copy of itself on every change, and the
  Charms panel resizes itself from a screen update that can be one step behind, so its
  resize overwrote the removal with the older copy. Saves now carry only the fields
  they change (`src/lib/characterData.ts`, tested), so nothing can undo a newer change.
  The panel's bottom edge jumped on every visit because it sized itself before the
  charm summaries had loaded and while the grid was still widening, and the grid then
  reported its older copy of the height back; it now waits for both, ignores the grid's
  copy of its height, and keeps the library for the visit. Deleting a ledger line now takes what it
  bought off the sheet if it is still in training, and asks if it is done
  (`src/lib/ledgerRemoval.ts`, tested).
- **2026-10-16** — **No Expense without a milestone.** Angel: an Expense must note the
  milestones spent. Saving an Expense (or paying for a charm) now needs at least one;
  something free is logged as Char. Creation. Existing zero-cost lines were left
  untouched (two on Kaien).
- **2026-10-16** — **Training on the sheet, and a tidier Milestones page.** Angel
  wanted charms to work both ways: adding a charm asks what milestones paid for it and
  logs the Expense (in training); logging an Expense for a charm puts it on the sheet.
  The same "What it bought" also covers ability dots, attribute dots and specialties.
  Anything still in training shows on the sheet, marked, and counts for nothing until
  done (tested: Ox Body levels, Excellency, defenses). The training list moved beside
  the ledger instead of above it, which pushed the ledger down; the totals went there
  too, so the ledger starts at the top. The screenshot script gained `--fill=` steps.
- **2026-10-16** — **Training.** Angel: spending milestones starts a training, and
  the Storyteller decides when it is complete. New Expenses start "In training"; the
  player's Milestones tab and the Storyteller's campaign page list what is in
  training, and either can mark it done ("In the oven" at the table; the app says
  "In training", Angel's pick). "Done" is kept in its own table, not in the sheet, so
  the player's next autosave can't undo the Storyteller's click; old Expenses count
  as done. The screenshot script gained `--click=Text` to open a tab first.
- **2026-10-16** — **A summary for every charm.** Angel asked for the remaining 464
  library charms to get a summary like Kaien's 20, so every card says what its charm
  does. Drafted from each charm's book text in the same style (cost and step first,
  core effect only) and filled by migration `2026_10_16_000003`, which only fills
  empty summaries — one written in Admin is never overwritten (tested).
- **2026-10-16** — **No implementation on/off switch.** Angel didn't want it. An
  implemented charm (Ox Body, Fists of Iron, Excellency) now always applies;
  `mechanicalEnabled` is still saved but no longer read, so an old "off" can't get
  stuck. Checked first: no live charm had it switched off.
- **2026-10-16** — **No ⚙ on charm cards.** Angel doesn't need to see on the card
  whether a charm's implementation is on; it's shown and switched in the charm window.
- **2026-10-16** — **Charm window: every control in the header, as icons.** Angel
  wanted all of a charm's info and controls up top instead of a text-button footer.
  The footer is gone; icon buttons (new dependency `lucide-react`, pinned to 1.49.0)
  sit right of the name and never wrap. Unavailable ones stay in place, dimmed, so
  the icons never shift. Checked against the library's longest name and requirement
  list (Prismatic Arrangement of Creation Form).
- **2026-10-16** — **Charm cards show the whole summary.** They cut it at two lines,
  which defeated the point of a summary (reading what a charm does at a glance), as
  Angel pointed out. Only the stand-in for a charm without a summary — the start of
  its book text — is still cut at two lines.
- **2026-10-16** — **New Charms panel: cards, hover, charm window, summaries.** After
  trying the three layouts on the preview page, Angel chose a mix of A and B: compact
  cards in a grid, filtered by a row of group buttons so he never scans past
  defensive charms to find a social one; hover shows the whole charm (after a short
  delay, which he may still change); a click opens a window over the sheet with the
  details and every action (edit, revert, repurchase, undo a purchase, remove, group,
  implementation), so the cards carry no buttons. Each card shows a one-line
  summary: a new `charm_library.summary` column holds a suggested text (editable in
  Admin), which a player can override per character. Summaries drafted for Kaien's 20
  charms. The preview page and the old two-column boxes are gone; purchase rules
  moved out of the Add Charm browser into `src/lib/charmPurchase.ts` with tests.
- **2026-10-16** — **Charm layout preview page.** Angel still wasn't happy with the
  Charms panel: wide cards mean a lot of scrolling, narrow ones turn into tall
  columns, and with every group on screen at once he still scans past the defensive
  charms to find a social one. Instead of another round of tweaks, three candidate
  layouts now exist side by side on `/character/:id/charm-preview` (nothing there is
  saved) so he can try them in his own browser with Kaien's real charms: A, compact
  cards that open on a click; B, compact cards that show everything on hover; C, full
  cards in newspaper columns, one group at a time. All three put a row of group
  buttons on top of the panel. Today's sheet is unchanged. Also: `npm run shots …
  --wide` screenshots at Angel's 2560px width, full page.
- **2026-10-15** — **Shared way of working.** The universal rules moved to the shared
  `~/.claude/CLAUDE.md` (all projects on the VM). `info/SESSION_SUMMARY.md` became the
  root `Summary.md` (auto-loaded); added `History.md`, `ROADMAP.md`, a `DemoSeeder`
  (adds a `demo` login, never wipes — the dev DB holds game content), `npm run shots`
  (serves `dist/` + forwards `/api`, like nginx) and `./ship.sh`. `deploy.sh` now
  migrates before building. The old rule "don't run a dev server, Angel checks live"
  is replaced by screenshots of the dev app. The dev database was migrated to the
  current schema (it was missing the campaigns tables and a column).
- **2026-10-02** —
    - Charms panel: cards in player-made groups, with drag and drop
    - Charms panel: drop group descriptions and the "Move to" menu
    - Charms panel: groups side by side, full always-open cards, gear toggle
    - Charms panel: two stacking columns per group
    - Charms panel: height always fits its content, no inner scrolling
    - Charms panel: narrower cards so six groups fit per row
    - Charms panel: cards 9.45rem wide (groups 19.15rem)
    - Charms panel: cards 9.5rem wide (groups 19.25rem)
    - Charm modes: several ability prerequisites mean "any one of them"
    - Charms panel: hide Ungrouped when it holds no charms
    - Charms panel: no inner scroll area, so wheel scrolling never stalls
    - Character page: tabs move up into the header row
    - Campaigns, step 1: server data and rules
    - Campaigns, step 2: campaign pages and read-only sheets
    - Campaigns, step 3: a character options page
    - Campaigns, step 4: the Circle tab
- **2026-10-01** —
    - Add a Laravel + MySQL backend and move the React app off Supabase
    - Add VM deploy and backup scripts and a CI workflow
    - Add the command that imports game content from a Supabase export
    - Make deploy.sh executable
    - Keep an empty resources/views so php artisan optimize can run
    - Document the VM setup and the move off Vercel + Supabase
    - Note the nightly backup cron in CLAUDE.md
    - CLAUDE.md: no Vercel freeze needed before moving to main
    - CLAUDE.md: the old Vercel project is now frozen
    - Add the command that imports accounts and characters from Supabase
    - Record the finished move off Vercel + Supabase
    - CLAUDE.md: the old Vercel and Supabase projects are deleted
    - CLAUDE.md: the raw Supabase export is deleted
- **2026-09-27** —
    - Make the milestone log work like the spreadsheet ledger
    - Milestone boxes show remaining/total with spend-option hovers
    - Implement Ox Body Technique and rebuild the health track
    - Split Ox Body into its own Soak line; simplify the health badge
- **2026-09-26** —
    - Rearrange the Essence panel into a 2-column, 3-row layout
    - Hide Solar caste modes from the other four castes
    - Float sheet tooltips above every panel; redesign the Defenses breakdown
- **2026-07-16** —
    - Add a test net, extract the charm rules, drop 450 lines of dead code
    - Pin the defence maths to the book; fix notes that never matched it
    - Enforce the Dice Limit on all five defences
- **2026-07-15** —
    - Merge Identity/Motes/Anima into one Essence panel; add Power and Will
    - Move Exalt Type/Caste to the page header; make Essence a 1-5 counter
    - Take lint to zero and keep it there
- **2026-07-11** —
    - Fix duplicate ability in Excellency/attribute choice pickers
    - Retrigger deploy after Vercel build-container-init failure (sts_credentials_fetch_failed, no code change)
    - Retry deploy — Vercel build-failure incident rollback in progress
    - Gate charm modes by relevance and Essence/ability/repurchase eligibility
- **2026-07-10** —
    - Show full charm text (name, description, modes) on the character sheet
    - Add standing directions and dev server config
    - Tie Excellency ability tags to actual charm purchases
- **2026-07-05** —
    - Prevent background reflow when a modal locks scroll
    - Add Expand All / Collapse All toggle to Add Charm browser
    - Add per-charm expand/collapse alongside Expand/Collapse All
    - Add Remove and Repurchase controls to the Add Charm browser
    - Tone down Remove button hover and drop redundant "Added" label
    - Add purchase-time choices for charms (ability/attribute/custom list/free text)
    - Fix Add button being hidden for non-repurchasable charms
    - Add temporary review workflow to triage charms needing a purchase choice
    - Add No Action button to the charm review workflow
    - Add multiselect choice type for target-bound, Essence-scaling charms
    - Generalize multiselect target selection beyond free text
    - Add per-purchase pick-count schedules for list-based choice charms
- **2026-07-04** —
    - Fix default health track to match book (two 0s, two -1s, two -2s, Incap)
    - Always force health track penalty structure to book default on load
    - Match Add Charm dropdown sorting/grouping to admin charm library
    - Add search, Show All toggle, and Exalt-type scoping to Add Charm modal
    - Let Ability dropdown filter charms without requiring a Type first
    - Stop Type and Ability filters from resetting each other in Add Charm
    - Rank Excellency ability first in charm lists and search results
    - Top-align and widen Add Charm modal; single-row filter controls
    - Right-size Add Charm filter controls
    - Lock background scroll while any modal is open
    - Close the top-most modal on Escape
- **2026-06-30** —
    - Fix expanded mode breakdown dropping duplicate-label modes (e.g. charms with two Upgrades)
    - Move Add Charm form into a modal instead of an inline panel over the table
    - Store structured prerequisites for Upgrade/Repurchase modes
    - Document unbracketed charm_modes backfill migration
    - Catalogue charm/mode Essence-tier scaling clauses (charm_essence_tiers)
- **2026-06-29** —
    - Render sheet modals via portal so they center on the viewport, not the panel
    - Add type/ability dropdown filters and search to Admin Charms tab
    - Redesign charm library as many-to-many abilities with table-based Admin UI
    - Drop legacy ability/sort_order columns from charm_library
    - Add prerequisite ability/essence and modes columns to charm table
    - Split charm prerequisites into relational ability/charm tables
    - Give each mode label its own distinct icon
    - Drop superseded charm_library.prerequisite_ability column
    - Prevent mode icons from wrapping in the Charms table
    - Add breathing room between charm row and its expanded description/impl panel
    - Give Charms table columns fixed widths sized to their longest content
    - Revert "Give Charms table columns fixed widths sized to their longest content"
    - Widen Charms table columns to fit content, fix double scrollbar
    - Fix Charms table header drifting away from body on horizontal scroll
    - Remove artificial max-width cap on Charms tab so the table can use full available width
    - Size Charms table to its content instead of stretching full width
    - Fix phantom horizontal scrollbar caused by vertical scrollbar gutter
    - Rebuild Charms table as a real HTML table instead of CSS grid divs
    - Style scrollbars app-wide to match the dark theme instead of OS default
    - Convert add/edit/remove buttons to icon-only throughout the app
    - Make bare + add buttons bigger and bolder to match X/pencil visibility
    - Shrink admin charm search bar to 1/4 width
    - Fix search bar width override with !important (textInput's w-full was conflicting)
    - Expand charm row by clicking anywhere on the row, not just the name
    - Fix expanded charm row stretching table width
    - Custom charm sort: Universal, Solar, Martial Arts, then alphabetical type; then first ability; then name
    - Order Type filter dropdown: Universal, Solar, Martial Arts, then alphabetical
    - Order Ability filter dropdown: alphabetical, then martial arts Style abilities alphabetically at the end
    - Group ability dropdown/filter by base ability name, collapsing parenthetical variants (e.g. Sagacity, Sagacity (Knowledge), Sagacity (Medicine) -> one Sagacity entry)
    - Show separate labeled mode breaks under expanded charm description (additive, original text untouched)
- **2026-06-28** —
    - Add exalt-type filtering to charm library and seed full book charm list
- **2026-06-24** —
    - Add standalone Bacon defense entry
    - Remove test Bacon defense entry
- **2026-06-18** —
    - Center Motes panel title; position Reset button absolutely
    - Revert "Center Motes panel title; position Reset button absolutely"
    - Center Current/Committed row in Motes panel
    - Fix Motes panel counter row clipping: use flex-1 halves instead of fixed gap
    - Update informational docs: defenses, charms, roles, settings/setup split
    - Add SESSION_SUMMARY.md for quick session context restoration
    - Rename Informational folder to info
    - Add hub HomePage with 2x2 icon grid; move character list to /characters
    - Add Exalt Type & Caste/Aspect system
    - Character creation modal with exalt type/caste; merge identity into essence panel
    - Make all sheet panels scrollable without visible scrollbar
    - Replace email auth with username auth (email hidden as username@exalted.local)
    - Fix auth: support existing real-email accounts alongside username@exalted.local
    - Add Change Username in Account settings
    - Add password visibility toggle on login page
    - Rename Setup to Admin, move tabs to side panel
    - Add Users tab in Admin with role management and character list
    - Add role change failsafes: can't demote self or last admin
    - Fix role tooltip overflow: show below instead of above
    - Remove role change tooltip
    - Remove display name feature, username is the identity
    - Require all 3 fields before character creation
    - Add delete and move character actions in Admin Users tab
    - Filter characters page to current user only
    - Add delete user button in Admin Users tab
    - Remove redundant Account card from home page
    - Update info docs to reflect current state of app
- **2026-06-17** —
    - Fix defense calculations: floor instead of ceil, weapon defense only on Full Defense, best armor soak/hardness instead of sum
    - Apply weapon defense bonus to Evasion on Full Defense, same as Parry
    - Fix Parry/Evasion round up; weapon defense on Full Defense or Defend Other; equipping armor unequips others
    - Apply all tag effects (Balanced, Improvised, Defensive, Shield) in FoI stat computation
    - Persist FoI state and originals to Supabase so it survives refresh and returning sessions
    - Rename Information tab to Tables; compact spacing throughout
    - Add empty Charms tab to Options page
    - Implement charm library system: global table, Options Charms tab, per-character charms with custom descriptions and FoI gate
    - Show charm edit controls to all logged-in users; RLS enforces write restrictions
    - Add user_profiles role system; gate charm library writes on admin role
    - Rename Options to Settings throughout UI
    - Split Options into Settings (all users) and Setup (admin only)
    - Add sidebar nav to Settings with Account and Appearance sections
    - Add editable username and password to Settings > Account
    - Add show/hide toggle to password fields in Settings
    - Redesign password section: panel + modal with eye-icon inputs
- **2026-06-15** —
    - Add Anima panel and Dawn Advantages gold indicators in Effects
    - Fix Vercel build: commit character.ts, CharacterPage, OptionsPage with anima/essenceMotes/animaStates
    - Add Reset button to Anima panel
    - Bring +/- buttons closer to anima number
- **2026-06-13** —
    - Add react-resizable as explicit dependency
    - Fix grid snapping: align panels to visual grid by zeroing margins
    - Fix grid snap: measure real container width via ResizeObserver
    - Move containerRef to grid div; remove pt-2 offset causing snap misalignment
    - Fix grid snapping: use v2 API with useContainerWidth + GridBackground
    - Downgrade to react-grid-layout v1; fix snap with getBoundingClientRect
    - Back to v2; larger amber resize handle; minW/minH on all panels
    - Raise resize handle z-index above drag handle and panel content
    - Disable auto-compaction so panels stay wherever placed
    - Extend grid canvas to 2000px so panels can be placed anywhere
    - Switch to 128 columns for finer grid resolution
    - Add inline edit to merits, languages, intimacies
    - Allow intimacy descriptions to wrap across multiple lines
    - Vertically center intensity badge on wrapped intimacy lines
    - Remove scrollbars from all panels
    - Add Charms panel with categories, expandable entries, drag-to-reorder
    - Allow panels to freely overlap during drag — no collision flinging
    - Move Edit Layout button to window header top-right
    - Add Effects and Inventory panels; fix missing panels from saved layout
    - Fix unused import causing build error
    - Add category drag-to-reorder in Charms and Effects panels
    - Hide scrollbars from all panels
    - Fix scrollbar still visible in Effects panel
    - Add Defense Other and Full Defense toggles to Defenses panel
    - Inventory: weapon/armor/other item types with modal editor and equipped toggle
    - Inventory: fixed Weapons/Armor/Other sections, single + item button, flat item list
    - Inventory: click item name to open detail modal
    - Weapon modal: weight dropdown, artifact checkbox + color picker; artifact color on item row
    - Inventory: remove kind badge from rows; artifact color on equipped checkbox
    - Fix unused badge variable after removing kind badge from item rows
    - Add Options page with editable weapon reference table (Information tab)
    - Options/Information: add Armor table; hover tooltips on all stat column headers
    - Options/Information: add Equipment Tags section with all tags from rulebook
    - Integrate GameData into ItemModal: dynamic weight/armor selection and tag picker
    - Widen ItemModal to 480px to reduce height and fix top overflow
    - Filter tags by item kind; add Melee/Ranged selector for weapons
    - Artifact auto-bumps stats; merge artifact+color into Combat Type row; hide Type Tags
    - Fix stat math: weight/armor selection respects current artifact state
    - Shield tag auto-adjusts damage (-1, min 0); weight change preserves Shield penalty
    - Floor all auto-computed stats at 0
    - Fists of Iron inline toggle on Unarmed weapons
    - FoI: replace inline sub-row with modal; show weight+tag on item row
    - Inventory row improvements: stats, FoI weight badge, Other expand
    - FoI on section header; artifact colors whole row; brighter stat numbers
    - FoI tag+weight badge appear before stats so numbers stay in same column
    - FoI applies real stat/tag changes; toggle button; auto-deactivate on weapon removal
    - Rename 'Defense Other' to 'Defend Other' in Defenses panel
    - Add Artifact option to FoI modal next to weight buttons
    - FoI modal: toggle in header, single Save button; change weight/tag while active
    - Hide inventory edit/remove buttons until row hover
    - Revert: keep inventory edit/remove buttons always visible
    - Allow multiple charms/effects expanded simultaneously
    - Implement Balanced (+Ov), Improvised (-Ac), Defensive (+De) tag stat effects; migrate existing items
    - Fix tag migration: wait for items to load from Supabase before applying
    - Recompute weapon/armor stats from source of truth on load and save
    - Calculate Parry, Evasion, Soak, Hardness from attributes/abilities/inventory; add Essence field
    - Parry uses Stamina, Evasion uses Dexterity, Resolve calculated from Integrity, add Essence panel
    - Remove equation breakdown text from defenses panel
    - Remove essence panel note; add hover tooltips to defense rows with formula values
    - Fix defense tooltip clipping: allow overflow on defenses grid panel
    - Add manual bonus field to Resolve
    - Make merits and intimacies panels scrollable without scrollbar
    - Redesign motes panel with +/- counters; add Essence & Motes table to Options
    - Increase total motes font size
    - Stack Total label above motes number, increase size
    - Reduce spacing between total and current/committed
    - Reduce top spacing in motes panel
- **2026-06-12** —
    - Initial commit
    - Initial project setup: React + Vite + TypeScript + Tailwind + Supabase auth
    - Merge remote initial commit
    - Add 4-tab structure: Sheet, Milestones, Notes, Characters
    - Trigger redeploy
    - Trigger redeploy 2
    - Trigger redeploy 3
    - Trigger redeploy 4
    - Trigger redeploy 5
    - Redesign Milestones tab: totals row, session rewards, purchase form, unified log
    - Redesign milestones: transaction-based table with gain/purchase forms
    - Hide date column from milestones table
    - Edit button on milestone rows, fix 404 on refresh, remove saved text and tab scroll arrow
    - Add character sheet: attributes, abilities with specialty and excellency
    - Trigger deploy
    - Rename Close Combat [Unarmed] to Close Combat
    - Add defenses, motes, health track, languages, merits, intimacies to sheet
    - Redesign sheet layout: 36-unit grid, compact sections, open col 4 for future
    - Shrink col 1 to 3fr
    - Remove spinner arrows from all number inputs
    - Set all number input boxes to 30px wide
    - Widen specialty column, narrow ability and ex columns
    - Set col 1 to 4fr
    - Scale grid to 64-unit system (7fr 7fr 11fr 39fr)
    - Set grid cols to 4fr 4fr 8fr 48fr
    - Add Informational reference files: scope, context, technical
    - Add drag-and-drop grid layout editor to character sheet
