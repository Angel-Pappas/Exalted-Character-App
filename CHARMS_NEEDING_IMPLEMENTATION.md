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
