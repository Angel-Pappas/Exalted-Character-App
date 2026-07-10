# Charms needing implementation

Charms whose purchase-choice metadata (choiceType, choiceOptions, etc.) may be
set up, but whose actual in-play mechanical effect isn't implemented anywhere
in the app yet (no character-sheet UI, no automatic bonus application, etc.).
We'll work through these one at a time later.

- **Beast-Uplifting Harmony** — purchase flow is implemented (multiselect:
  bind a companion, choose up to Essence of 5 benefits). Not implemented: any
  actual tracking of companions/familiars on the character sheet, applying
  the selected benefits' mechanical effects (dice pool +2, extra Health
  levels, etc.), or letting the player revise an existing companion's
  benefit selection when Essence increases (currently only supports binding
  a *new* companion via repurchase).

- **Sharpshooter's Clever Tricks** — purchase flow is implemented (pick 2 of
  its 4 modes on first purchase, then repurchase once for 1 more of the
  remaining 2, hard-capped at 2 total purchases — always leaves exactly 1 of
  4 unchosen). Not implemented: applying any of the 4 modes' actual mechanical
  effects (Ranged Combat penalty reduction, gambit cost/dice changes, Build
  Power via non-attack shots, ensnare/pull without weapon tags, etc.). The
  charm's Repurchase mode ("Ranged Combat 4") is now visually gated on the
  sheet (greyed out until Ranged Combat 4 and an actual repurchase — see
  `modeLockReasons` in `SheetTab.tsx`), but this is display-only: no charm's
  purchase prerequisites are enforced at buy time anywhere in the app. Also
  note the sheet shows all 4 named mode descriptions regardless of which 2-3
  were actually picked — there's no data link between a `charm_modes` row and
  a specific `charm_choice_options` pick, so it can't tell which to hide.

- **Arsenal-Summoning Gesture** — purchase flow is implemented (custom list:
  choose Weapons or Armor). Not implemented: the summon/banish action itself
  (no "Elsewhere" storage slot, no mote-spend button on the sheet to call the
  chosen gear into hand at short range).

- **Augmented Attribute** — purchase flow is implemented (custom list:
  choose Force, Finesse, or Fortitude). Not implemented: applying the
  Excellency dice bonus, and more fundamentally, the sheet only tracks the
  classic 9 Attributes (Strength/Dexterity/Stamina/etc.) — it has no concept
  of the Alchemical Force/Finesse/Fortitude groupings the charm's choice
  options map to, so there's currently no rating for the bonus to attach to.
