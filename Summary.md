# Summary — Exalted Character App

**How the app works today** (auto-loaded every session via `CLAUDE.md`). Rewrite the
relevant section in place when something changes; the dated what/why goes in
`History.md`, plans in `ROADMAP.md`. Deeper reference: `info/` (context, scope,
technical).

---

## What This App Is
A web-based interactive character sheet for a **custom version of the Exalted tabletop RPG**. Built for Angel and his co-players. Live at https://exalted.pappas.yoltobots.click.

- Stack: React 19 + Vite 8 + TypeScript + Tailwind CSS v4 front end; Laravel 13 API (`backend/`) + MySQL 8.4; all on our own VM (nginx + php8.5-fpm). Moved off Vercel + Supabase in October 2026.
- Repo: https://github.com/Angel-Pappas/Exalted-Character-App
- Dev checkout: `/home/ploi/exalted-dev`. Live folder: `/home/ploi/exalted.pappas.yoltobots.click` (changed only by `./deploy.sh`). See `CLAUDE.md` for the workflow.
- Changes are looked at first via screenshots of the dev app (`npm run shots`); Angel then checks the live site
- **Always commit, push and deploy after every code change** — no need to ask

---

## Users & Roles
- Two roles: `admin` and `player`, in `users.role`. New signups always get `player`.
- **Auth is username + password only — no emails.** Laravel cookie sessions. Usernames are stored lowercase; the old Supabase form `username@exalted.local` still signs in. The login page shows only "Username" and "Password" fields.
- Angel's username: `angel`, UUID `c5d208d8-3d47-4dc3-b76b-c211d8486c3b`, role `admin`
- `AuthContext` exposes `user`, `username` and `role: 'admin' | 'player' | null`
- New accounts are active immediately
- Admin can manage users (role change, delete) via Admin → Users tab
- **Failsafes (enforced by the server):** can't change your own role or delete yourself — so the last admin can never be removed

---

## Pages & Routes
| Route | Page | Who |
|---|---|---|
| `/` | HomePage (hub) | all |
| `/characters` | CharactersPage | all |
| `/character/:id` | CharacterPage (sheet) | all |
| `/character/:id/milestones` · `/notes` · `/circle` | CharacterPage, that tab | owner / admin |
| `/character/:id/people` · `/people/:pageId` | People & Places, a page | owner only |
| `/options` | SettingsPage | all |
| `/character/:id/options` | CharacterOptionsPage | owner / admin |
| `/campaigns` | CampaignsPage | all |
| `/campaign/:id` | CampaignPage | campaign members |
| `/setup` | SetupPage (Admin) | admin only |
| `/login` | LoginPage | unauthenticated |

**Page header and navigation (2026-10-22, Angel: "feels off compared to usual apps").**
Every page uses `src/components/PageHeader.tsx`: it stays at the top while the page
scrolls, starts with a breadcrumb trail of real links ("Exalted / Characters /
Kaien", on a phone just "‹" to the parent) and sets the browser tab's title
("Kaien · Exalted"). Everything that goes to another page is a link (`<Link>`), never a
button with a click handler, so middle-click / Ctrl-click opens it in a new tab and the
browser's Back button works. The character page's tabs have their own addresses
(`src/lib/characterTabs.ts`, tested), so Back steps between tabs and a reload keeps
the tab. Someone else's character (opened from a campaign) has "Campaigns" as its parent.
Closing the browser tab within the second before a sheet save goes out sends the save
at once and lets the browser ask "Leave site?". Buttons show the hand cursor, and the
keyboard focus gets an amber outline.

**HomePage** (`/`): where a player lands — "Your characters" and "Your campaigns" side by side (stacked on a phone), each a link straight to the sheet or campaign; "New or manage →" goes to the Characters / Campaigns pages, which keep creating and deleting. Settings, Admin (admin only) and Sign out sit in the header. (Until 2026-10-22 it was four tiles, which cost an extra click on every visit.)

**CharactersPage** (`/characters`): list of the current user's characters with ExaltType·Caste subtitle. "+ New Character" button opens modal requiring all 3 fields (name, exalt type, caste/aspect) before enabling Create. Delete (shown on hover on a desktop) asks for a second click — it used to delete at once.

**SettingsPage** (`/options`): left sidebar (on a phone, a row of tabs across the top, like Admin's) → Account (username read-only with Change button, role read-only, Change Password modal with eye-icon fields + current-password re-auth) + Appearance (light/dark theme toggle; the choice is kept per browser and applied before the page first paints, so light mode never flashes dark).
- Display name has been removed — username is the only identity.
- Change Username saves through `PUT /api/me/username`.

**SetupPage** (`/setup`, called "Admin" in UI): left sidebar tabs → Tables | Charms | Users.
- **Tables**: editable Weapons/Armor/Tags/EssenceMotes/AnimaStates + Exalt Types
- **Charms**: global charm library CRUD
- **Users**: list of all users with username, role dropdown, character count, expandable character list. Per-character: Move (reassign to another user) and Delete (✕). Per-user: Delete button (hidden for self). Role dropdown locked for self.

---

## Database (MySQL, via the Laravel API)
| Table | Purpose |
|---|---|
| `users` | username, password hash, `role` (`admin`/`player`) |
| `characters` | Per-user characters; `data` JSON holds all CharacterData, stored verbatim |
| `game_data` | Per-user reference tables (weapons, armor, tags, essence motes, anima states) |
| `charm_library` (+ child list tables) | Global charm list; everyone reads, admins write |
| `exalt_types` | Global exalt types with caste label and castes (10 seeded) |
| `training_completions` | Which milestone trainings are done, when and by whom (kept outside the sheet) |
| `wiki_pages` (+ `wiki_page_groups`) | People & Places pages per character: kind, name, place, text, sections, image path |

The schema is `backend/database/migrations/`. Who may do what is enforced in Laravel
(`CharacterPolicy`: owner or admin; `can:admin` routes for admin tools) and covered by
Pest tests in `backend/tests/Feature/`.

---

## Campaigns (added 2026-10-02)
A campaign is one story a group plays. **Storyteller (ST) is a per-campaign role and has nothing to do with admin/player.**
- Anyone creates a campaign and becomes its ST. Only the ST renames/deletes it, adds members by username, removes members and hands the ST role to another member (old ST stays a member). Members can leave; the ST can't until they hand the role on. A member leaving/removed takes their characters out of it. Deleting a campaign never deletes characters.
- Characters have `kind` `pc`/`npc` (chosen at creation, switchable any time by the owner on the character's Options page). A character can be in many campaigns; its owner puts it into campaigns they're in. Public/private is **per campaign** (`campaign_characters.visibility`); joining defaults PCs public, NPCs private.
- Seeing sheets: owner and admins (edit, as before). The campaign's ST opens every character in it; other members open the ones public there — **view only** (`canEditCharacter` on the page, `CharacterPolicy::view` on the server). Members see every PC's *name*; NPCs only if they may open them.
- Someone else's character opens with only the Character Sheet tab, "View only": a disabled `<fieldset>` switches off every control and nothing is saved.
- **Circle** tab (replaced the old "Characters" NPC-notes tab, whose saved `npcs` data is left untouched and unused): the other players' PCs in each of the character's campaigns, with notes only the character's owner can read (not the ST, not admins) — `circle_notes`.
- Server: `CampaignController`, `CharacterCampaignController` (options + campaign membership), `CircleController`; rules covered by `tests/Feature/CampaignTest.php`.

## People & Places (added 2026-10-23)
A character's own wiki of the people, places and groups it knows (tab "People & Places",
`src/tabs/WikiTab.tsx`). **Only the character's owner reads or edits it** — not the
Storyteller, not admins (`WikiController`, tested in `tests/Feature/WikiTest.php`).
- Every page is a **person**, **place** or **group**, with a name (unique in the wiki,
  ignoring case), an optional image, the main text and optional titled sections
  (reorder, remove). Read view first, like Wikipedia; **Edit** turns it into fields, and
  changes save a moment after typing stops.
- Each page has a **place** (a person's current place, the place a place sits in, where a
  group is based) and **groups**. A place page lists the people and groups in it and in
  the places inside it ("· in Lower Market"), and its places within; a group page lists
  its members, each with where they are. Every page lists what mentions it. The list on
  the left shows people with their place, places as a tree, then groups.
- **Links:** typing `[[` in any text opens a list of pages; a name with no page yet can
  become a new person, place or group right there. A link points at the page (its id),
  so it shows the current name after a rename (unless it has its own wording, like a Wikipedia piped link: "Cato" for Cato Meren — `linkText`); it opens the page on click (Ctrl-click
  while editing) and shows a preview card after a short hover (image, kind, place, the
  start of the text). A link whose page is gone is red and starts a page with that name.
  The list on the left wraps long names rather than cutting them off.
- Text is stored as the editor's JSON (Tiptap 3, pinned), not Markdown — Angel's call,
  so links never break on a rename. The derived lists are worked out in the browser
  from all pages (`src/lib/wiki.ts`, tested); the server keeps the facts consistent (a
  place is a place, groups are groups, no place inside itself).
- **Images** are shrunk in the browser to at most 1600px (`src/lib/imageResize.ts`): the
  server takes 2 MB (`upload_max_filesize`), and redrawing drops the photo's metadata.
  Stored on the private disk (`storage/app/private/wiki/<character>/`), served only to
  the owner, removed with the page, the character or the account, and copied nightly by
  `backup-db.sh` into `~/backups/exalted/wiki-images/` (a copy that only grows).
- The editor loads only when the tab is opened (a separate bundle).

## Milestones and training (training added 2026-10-16)
The Milestones tab is a ledger of Income and Expense lines (logic in
`src/lib/milestones.ts`, tested). The ledger fills the page from the top; beside it sit
the four remaining/total tiles (hover one for what that type buys) and the **In
training** list. **Spending milestones starts a training:** a new Expense has "In
training" ticked (untick it for something that needs none). Training time is entirely
the Storyteller's call, so the app only records "started" (the line's date) and "done".
- **An Expense spends at least one milestone unless it says why it doesn't**
  (Angel, 2026-10-22): its form has two toggles, **Free** (given for free, e.g. by
  the Storyteller in downtime; can still be in training) and **Char. Creation**
  (bought with the starting build; undated, never trains, listed first). Either one
  hides the milestone fields and shows on the line as its tag instead of "Expense"
  (`MilestoneTransaction.cost`). Without one, Save (and the charm payment prompt,
  which offers Free and Char. Creation too) stays disabled until a milestone is
  entered. There is no separate "+ Char. Creation" button. Ledgers saved before
  this had Char. Creation as a line kind of its own; migration `2026_10_22_000001`
  converted them (and marked zero-cost Expenses Free), and `normalizeLedger` reads
  any old copy the same way.
- The In training list shows the longest-waiting first, each with a **Done** button.
  Ticking "In training" again in a line's edit form puts it back (for a Done pressed by
  mistake).
- **Charms and the ledger stay in step** (`src/lib/charmTraining.ts`, tested). Adding or
  buying a charm again on the sheet asks what paid for it (Exalted / Minor / Personal
  and how many, Free, or Char. Creation) and logs that line, linked to the charm
  (`MilestoneTransaction.charm`). The other way round, a new Expense
  can pick "What it bought": a charm (from the Add Charm browser), which lands on the
  sheet. Undo last purchase / Remove in the charm window take their linked lines with
  them. **Deleting a ledger line** that bought something still on the sheet (a charm
  purchase, dots, a specialty): if it is still in training, the purchase leaves the
  sheet with it; if its training is done (or it never trained), a dialog asks
  "Remove … from the sheet too?" — Remove from sheet / Keep on sheet / Cancel. A
  charm bought several times loses one purchase (`src/lib/ledgerRemoval.ts`, tested).
- **Dots and specialties** (`src/lib/traitTraining.ts`, tested): "What it bought" can
  also be ability dots (+1 to +3), an attribute dot or a specialty. Saving raises the
  rating (or sets the specialty) on the sheet at once (`MilestoneTransaction.trait`).
- **On the sheet, what is in training counts for nothing yet:** a charm whose purchases
  are all in training is dimmed with a dashed border and a "Training" tag, and has no
  effect; a repurchase in training shows "+1 training" and only the trained purchases
  work (Ox Body levels, Excellency picks). Ratings with dots in training and specialties
  in training get a dashed amber outline. A rating shows its value **without** the dots
  in training (Angel: the future value was confusing); hover says what it goes to when
  done, and typing a new value keeps the training dots on top (`trainingHint`,
  `ratingToStore` in `src/lib/traitTraining.ts`, tested). Defenses,
  Ox Body, Excellency and charm prerequisites all use the ratings without them. The
  charm window says since when it trains, with its own Done button.
- The Storyteller sees an **In training** box at the top of the campaign page: every
  character in the campaign with trainings still going, with the same Done button.
- Who may mark done or undo: the owner, admins, and the Storyteller of any campaign the
  character is in (`CharacterPolicy::train`). That is all the Storyteller gains; the
  sheet itself stays view-only for them.
- The sheet's Expense line carries only `training: true`; "done" lives in
  `training_completions`, because the player's open page saves the whole sheet and
  would overwrite a change the Storyteller made inside it. Expense lines logged before
  training existed have no flag and count as done. Server: `TrainingController`,
  tested in `tests/Feature/TrainingTest.php`.

## Character Sheet
11 draggable/resizable panels on a 128-column grid. Layout saved per character in the database. The grid is exactly as tall as its panels reach (it used to be at least 2000px, so the page scrolled into empty space); in Edit Layout it has room below to drag a panel down.

**On a phone** (sheet narrower than 768px, `STACK_BELOW_PX`) the sheet shows one *page* of panels at a time instead of one long column (Angel, 2026-10-22: too much scrolling up and down; never two panels side by side). The eleven panels are grouped by use (`src/lib/phonePages.ts`, tested): Traits (Attributes, Abilities), Combat (Essence, Health, Defenses), Charms, Gear (Inventory), Social (Intimacies, Merits, Languages), Effects; a panel no group names gets its own page. A bar of the six names, sharing the width so none is cut off, stays under the header (`--page-header-h`, published by `PageHeader`); tapping a name or swiping sideways turns the page, which opens at its top. The page last looked at is kept for the browser tab's session (`PhoneSheet`). Each panel is as tall as its content; the saved layout is never changed there, and Edit Layout is hidden. The page header puts the tabs on a row of their own. The Milestones page stacks too (totals and training first), and its ledger shows each description under its type, with three-letter column headings.

The **Essence** panel holds every pool in one box: an Essence | Anima row on top,
then Motes (Current | Committed), then a Power | Will row. Power and Will are 0–10; Essence is 1–5 and has no reset
(it is a permanent trait, not a per-scene pool). All three look and behave like Anima
minus its state label and color ramp. The panel has no title of its own — the counter
row's labels serve as one. A panel narrower than 9.5rem (a container query on its own
width) stacks each pair instead of cutting the labels off ("ESSE…", found 2026-10-15).

Older layouts are migrated on load and the rest of the column reflows to match: sheets
with separate `motes`/`anima` panels get them folded in, and an Essence box still at the
old `LEGACY_ESSENCE_H` is resized to `ESSENCE_H`. Any other height is player-chosen and
left alone.
All panels are scrollable with hidden scrollbars (`overflow-y-auto no-scrollbar h-full`).

### Identity
Each character has: name, exalt type (from `exalt_types` table), caste/aspect. Set at creation and not editable on the sheet. Shown in the CharacterPage header next to the name as `Type · Caste` — bare values, no "Exalt Type"/"Caste" labels, matching the CharactersPage subtitle.

### Attributes (9 total)
Physical: Strength, Dexterity, Stamina — Social: Charisma, Manipulation, Appearance — Mental: Perception, Intelligence, Wits

> **Important:** The book says "highest appropriate attribute" in many places. This app uses 9 fixed attributes with each stat mapped to a specific one. **Ignore "highest attribute" wording from any book quotes.**

### Abilities (14)
Athletics, Awareness, Close Combat, Craft, Embassy, Integrity, Navigate, Performance, Physique, Presence, Ranged Combat, Sagacity, Stealth, War

### Defense Calculations (all auto-calculated)
Maths in `src/lib/defenses.ts`, pinned by `src/lib/defenses.test.ts`, which quotes the book.
```
Parry    = ceil((Stamina + Close Combat) / 2) + wpnBonus + defenseBonus.parry
Evasion  = ceil((Dexterity + Athletics) / 2) + wpnBonus + defenseBonus.evasion
Soak     = 1 + (Physique >= 3 ? 1 : 0) + bestArmorSoak + defenseBonus.soak
Hardness = 2 + Essence + bestArmorHardness + defenseBonus.hardness
Resolve  = (Integrity >= 3 ? 4 : Integrity >= 1 ? 3 : 2) + defenseBonus.resolve

wpnBonus = highest defense value among equipped weapons, ONLY when Full Defense OR Defend Other is active

The Dice Limit applies to all five (they are static values):
  value = base + min(5, gearBonus) + manualBonus,  floored at 1 if a penalty pushed it under
  gearBonus = armour Soak/Hardness, or weapon Defense on Parry/Evasion
  the manual bonus box is EXEMPT from the cap (Angel's call — it's an override)
```
**Soak uses Physique, not Stamina. Resolve does not use Wits.** These three read wrong in
this file until 2026-07-16 — the old text was a guess that never matched the book or the
code. See `info/context.md` for the book wording verbatim. If code and book disagree, the
book wins; never "fix" the code to match a paraphrase.

Only one armor can be equipped at a time (equipping one auto-unequips others).

### Charms
- Global library in `charm_library` (admin manages via Admin → Charms)
- Players browse the library and add charms to their sheet as `CharacterCharm[]`
- **Charms panel (since 2026-10-16):** a row of group buttons in the header (All, each group with its count, Ungrouped while it holds charms or a charm is being dragged) picks what shows; the choice is kept for the visit, not saved (`src/lib/charmSelection.ts`, tested). Under All, each group shows under a small heading. ✎ ✕ after the buttons edit/delete the selected group. Charms show as compact cards (min 13rem, filling the panel's width): group colour bar, name, ×count and its **summary**, always in full (a card without a summary shows the start of the charm text instead, cut to two lines). Resting the mouse on a card (after the 300 ms hint delay) shows its full text, choices and modes in a pop-up. Clicking a card opens the **charm window** over the sheet. Its header holds everything about the charm: name (×count), type · abilities · page and prerequisites on the left, wrapping as needed; on the right, never wrapping, the controls as icon buttons (lucide-react, pinned): Group dropdown, Repurchase, Undo last purchase, Remove (asks for a second click), Close. A button that can't be used stays in place, dimmed, and its hint says why. Below: summary and charm text, each with ✎ edit and ↺ revert icons by its label, and Ox Body's health-level picks. The modes the character has are written exactly like the charm text (same size and colour, only the gold label marks them); a locked mode is dimmed and says why. Purchase rules (`canBuyAgain`, `addPurchase`, `undoPurchase`) live in `src/lib/charmPurchase.ts`, tested, shared with the Add Charm browser.
- **Summaries:** `charm_library.summary` holds a suggested one-liner per charm (Admin → Charms edits it); a player can override it per character (`CharacterCharm.customSummary`). The card shows the player's, else the library's, else the start of the charm text (`cardSummary`). The library is read live, so a summary written in Admin reaches every sheet. Every library charm has one: Kaien's 20 (migration `2026_10_16_000002`) and the other 464 (`2026_10_16_000003`), drafted from the book text — core effect only, with cost and combat step first; exalt-type modes stay in the full text. Charms added later start without one.
- Groups (`SheetData.charmGroups`, per character, never premade): name and colour only. A charm sits in at most one group (`CharacterCharm.groupId`; absent = Ungrouped); order inside a group is the array order. Dragging a card onto another puts it before that card (joining its group); onto a group button, at the end of that group; a group button onto another moves the group before it (off in layout-edit mode). Deleting a group ungroups its charms, never deletes them. Logic in `src/lib/charmGroups.ts` (tested). Sheets saved earlier may still carry a `column` per charm from the old two-column boxes; it is ignored.
- The Charms panel never scrolls: it measures its content (ResizeObserver) and sets its own grid height (`rowsToFit`), and `fitPanelHeight` (`src/lib/panelLayout.ts`, tested) moves panels below it in the same columns by the same amount. Its height can't be dragged in layout-edit mode, only its width. It sizes itself only once the library (the cards' summaries) has loaded, and the grid mounts at its measured width (`measureBeforeMount`), so the panel opens at its final height instead of jumping; the library is kept for the visit (`cachedCharmLibrary`, refreshed on each open). The grid's own layout reports never change the Charms height (`gridLayoutChange`, tested) — its copy can be a fit behind, which made the panel flip between two heights.
- Each CharacterCharm: `libraryId`, `name`, `libraryMechanicalKey` (denormalized), `customDescription` and `customSummary` (player overrides), `mechanicalKeyOverride`
- Effective mechanical key = `mechanicalKeyOverride ??` the library's key (read live) `?? libraryMechanicalKey` (`charmKey`), so a charm bought before its key was set still works; a charm with a key the sheet computes (`ox_body`, `foi`, `excellency`, and those below) always applies — there is no on/off switch since 2026-10-16 (`mechanicalEnabled` is still saved but no longer read)
- Custom descriptions override library text per character; can be reverted

### Using charms on the sheet (since 2026-10-16)
Angel's rules: no "Use" buttons and no tracking of costs or combat steps (the table tracks
those). Set once per charm in Admin → Charms, for every character (`charm_library`
`commit_motes`, `commit_needs_repurchase`, `ongoing`, `purchase_limit`). Logic in
`src/lib/charmUse.ts`, tested.
- **Every charm is set up** (2026-10-17): the list, charm by charm, is
  `info/charm-implementation.md`; open questions in `CHARM_QUESTIONS.md`.
- **Commit dots** on the card, one per mote the charm commits, plus those of any mode the
  character owns that commits (`charm_modes.commit_motes`, set by migration — modes aren't
  edited in Admin): its own Exalt type's mode, an unlocked upgrade or repurchase. Dots
  imply the in-use icon. Clicking an empty dot does
  what raising Committed by hand does (a mote from Current to Committed, anima +1; not with
  Current at 0); clicking a lit one gives the mote back (`CharacterCharm.litDots`). Iron
  Kettle Body's dots only appear from its repurchase.
- **In-use icon** (⚡) for charms with an ongoing effect; off by default, click to switch
  (`CharacterCharm.inUse`). Dots and icon are independent. Sheet effects apply only while
  it's on, and never for a purchase still in training: **Iron Kettle Body** adds Soak equal
  to its lit dots, **Endurance of a Thousand Cuts** adds the current wound penalty to
  Soak. Since 2026-10-17 all sheet effects live in `src/lib/charmEffects.ts` (tested),
  keyed by mechanical key: flat bonuses to Parry, Evasion, Soak, Hardness or Resolve
  (Mantis, Wood Dragon, Crane and Earth Dragon Forms, Root-and-Hand Merging, Skin-Flaying
  Wind Dance, Undying Body, Viridian Rust Defense, Void Avatar Embodiment, Soul Fire
  Shaper Form, Loyal Guardian Approach's Alchemical/Janest modes with Defend Other);
  Parry/Evasion from another Ability (Streaming Arrow Stance, Games of Divinity Form,
  Ebon Shadow Form, and Defense of Shining Joy — always on, used when higher); wound
  penalty −1 (Undying Body, Relentless Lunar Fury; Earth Dragon Form ignores it for a
  Dragon-Blood), shown on the Health badge with a hint; temporary Bruised levels
  (Heartless Maiden Trance, Undying Body at Essence 3/5), marked with a blue dot. Each
  gets its own breakdown line and counts like Ox Body's +1 (base, not gear). A charm
  with a key but no icon applies always. Fists of Iron's icon is display only: lit while
  FoI is on in the Inventory.
- **"!" mark** on the card (and in the charm window, saying what to fix) when a charm is
  bought more times than its limit (a number, or a trait's rating: Essence, Physique… —
  every purchase counts) or a purchase is missing its choice.
- **Choices:** Righteous Lion Spirit asks, when bought, which Major or Defining Intimacy it
  protects (`protectedIntimacyId`; changeable in the charm window); that Intimacy is marked
  gold in the Intimacies panel. Each repurchase of Unconquered Sun's Sight asks for an
  ally's name (free text, `repurchaseAllies`; edited in the charm window). Lighting Ward of
  the Sun's dot asks who is warded (`wardName`), shown on hover, cleared when the dot or
  the icon goes off; it doesn't touch Full Defense or Defend Other. "Later" leaves a
  choice open, and the "!" shows until it's made.
- **Purchases:** a charm with Repurchase modes has a limit of one more per mode; a limit
  above 1 also allows rebuying a charm without a Repurchase mode (numeric limits stop
  there). A pick schedule with 0 skips the choice for that purchase (Technique-from-Taste
  asks only when first bought, Unfettered Sun Evasion only on its repurchase).
  Sharpshooter's Clever Tricks shows only the tricks picked (`isUnpickedChoiceMode`).
- Arsenal-Summoning Gesture: per Angel's homebrew its Dawn mode, Perfected Panoply
  Selection, is a third purchase (a third choice, limit 3).

### Fists of Iron Technique (FoI)
- FoI button only appears if a charm with effective key `'foi'` exists
- Opens modal: choose weight + tag + artifact toggle
- Tag effects: Shield→−1 dmg, Balanced→+1 ovw, Improvised→−2 acc, Defensive→+1 def
- FoI state (`foi` + `foiOriginals`) is **persisted in SheetData** (survives refresh)

### Health track and Ox Body Technique
- A level's boxes wrap onto another row when the panel is too narrow, never past its edge
- Damage is one number (`SheetData.damage`), filled left to right; the track itself is rebuilt each render from the starting seven plus Ox Body levels (`src/lib/health.ts`, tested)
- Ox Body is recognised by mechanical key `ox_body`: +1 base Soak once (`defenses.ts`), and per-purchase health levels by Exalt type; Solar/Abyssal/Janest choose per purchase (`CharacterCharm.oxBodyPicks`)

### Inventory
- Flat `InventoryItem[]`, rendered as Weapons → Armor → Other
- Weapons: accuracy, damage, defense, overwhelming; artifact toggle (+1 all stats); tags
- Armor: soak, mobilityPenalty, hardness; artifact toggle (+1 soak+hardness); single equip rule
- Stats auto-filled from GameData reference tables in modal

---

## Key Rules for Development
1. **All state that should survive a refresh or session gap goes to the database through the API** — never use local React state for persistent data
2. **Tabs send only the sheet fields they change** (`onChange(patch)`); the page merges them onto the latest data (`applyChange`). Never send a whole copy of the sheet: one made from an older render overwrites newer changes (the lost charm removal of 2026-10-16)
3. **Always commit, push and deploy after every code change** — no need to ask
4. Ignore "highest appropriate attribute" from book quotes — each stat has a fixed attribute mapping
5. **Colours come from the palette in `src/index.css`, never from hex values in components.** Components use Tailwind's stone (greys) and amber (gold) scales plus a few accent hues; `@theme` gives them the dark theme's values and `.light-mode` turns every scale around (darkest greys become the page, accent shades used as text become deep ones). Text on a button filled with amber is `text-stone-950`, on a filled grey button `text-stone-100`, so both flip with the theme; plain `text-white` is only for saturated fills (red, green, blue). A new colour shade needs a light-mode value too, checked to reach 4.5:1 (WCAG AA) as text on stone-950, stone-900 and stone-800.
6. **Never prompt for permission** except before permanently deleting DB data or changing admin access
7. **Tooltips on the sheet use `data-tip="…"`, never `title=`** — `src/components/Tooltip.tsx` renders them above every panel and keeps them in the window. Rich content (the Defenses breakdown) uses `<Tooltip content={…}>`. Icon-only buttons also need `aria-label`, since the hint no longer names them.

---

## File Structure (key files)
```
src/
  App.tsx                  # Router: / → HomePage, /characters → CharactersPage, /character/:id, /options, /setup
  contexts/
    AuthContext.tsx         # user, username, role, signIn/Up/Out, changeUsername/Password
    ThemeContext.tsx        # theme: 'dark'|'light', persisted to localStorage
  pages/
    HomePage.tsx            # Hub: Characters, Settings, Admin (admin only) cards
    CharactersPage.tsx      # Character list + creation modal (all 3 fields required)
    CharacterPage.tsx
    SettingsPage.tsx        # /options — Account (username/password) + Appearance
    SetupPage.tsx           # /setup — Tables | Charms | Users tabs
    LoginPage.tsx           # Username + password only; eye-icon toggle on all password fields
  tabs/
    WikiTab.tsx             # People & Places (editor and previews in components/wiki/)
    SheetTab.tsx            # All 11 panels + defense calculations + FoI + CharmPanel
  types/
    character.ts            # All interfaces + DEFAULT_GAME_DATA + ExaltType
info/
  (Summary.md is at the repo root)
  context.md                # Game rules, mechanics, full feature descriptions
  scope.md                  # Purpose, design philosophy, what's not in scope
  technical.md              # Stack, DB schemas, all types, file structure, code snippets
  lib/api.ts                # the only HTTP client: /api on the same origin
backend/                    # Laravel API — routes/api.php, app/, database/migrations/ (the schema)
deploy.sh, backup-db.sh     # live-folder deploy (backs up MySQL first) and nightly backup
supabase/                   # old Postgres schema — historical record only
```

---

## Current State
Running on our VM since 2026-10-01 (Laravel + MySQL), with all data moved over from
Supabase: accounts `angel` (admin) and `angeltest` (player), with their passwords, and
their characters. The old Vercel + Supabase app was deleted on 2026-10-01 (see `CLAUDE.md`).
Admin panel covers Tables, Charms, and Users management.

What's next: `ROADMAP.md`.
