# Roadmap

What's built, what's next, and ideas. Tick items off and add new ones with every
change (how things work: `Summary.md`; what changed and why: `History.md`). Angel sets
the priorities — the order under **Next** is a suggestion until he does.

## Built

- [x] Character sheet (attributes, abilities, defenses, health, essence/motes,
      inventory, intimacies, merits, effects, charms with the charm library).
- [x] Characters list, character options, milestones, notes.
- [x] Campaigns with the Circle tab.
- [x] Admin: tables, charms and users; username + password accounts.
- [x] Moved to our VM (Laravel API + MySQL), 2026-10-01.
- [x] Way of working: shared rules, demo login + screenshots, one-command ship.
- [x] Charms panel: group buttons, compact cards with summaries, hover, charm window (2026-10-16).
- [x] Summaries for every charm in the library (2026-10-16).
- [x] Training, piece 1: spending milestones starts a training; player and
      Storyteller lists; either marks it done (2026-10-16).

## Next (suggested)

- [ ] **Training, piece 2: charms on the sheet.** A charm bought with milestones
      shows on the sheet dimmed, "in training", its effects off until done (Angel
      chose "mark it on the sheet", 2026-10-16). Needs the Expense line linked to the
      charm.
- [ ] **Training, piece 3: dots and specialties on the sheet.** An ability/attribute
      dot or specialty in training shows hollow; defenses ignore it until done (tests).

- [ ] **Cut-off headings on the character sheet** — "Essence", "Anima" and "Power"
      show as "ESSE…", "ANI…", "PO…" at desktop width (found in the first screenshot
      review, 2026-10-15).
- [ ] **Light mode** CSS theming pass.
- [ ] **Charm mechanics** charm by charm, as needed — the list is in
      `CHARMS_NEEDING_IMPLEMENTATION.md`.

## Ideas / later

- [ ] Make the GitHub repo private (it was public only for Vercel's free tier).
