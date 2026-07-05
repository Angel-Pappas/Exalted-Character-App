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
  Power via non-attack shots, ensnare/pull without weapon tags, etc.), and the
  Repurchase mode's "Ranged Combat 4" prerequisite isn't enforced anywhere —
  no charm's purchase prerequisites are gate-checked by the app currently,
  this isn't specific to this charm.
