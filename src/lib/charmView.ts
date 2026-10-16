import type { CharacterCharm, CharmGroup } from '../types/character'

// How the Charms panel presents charms. `boxes` is today's sheet (every group in a
// box of two stacking columns); the others are the layouts on trial in the charm
// layout preview page, which share a row of group buttons on top:
//   click — compact cards (name + two lines); a click opens one full width
//   hover — the same compact cards; resting the mouse on one shows it all
//   open  — full cards packed in newspaper columns, one group at a time
export type CharmView = 'boxes' | 'click' | 'hover' | 'open'

export const CHARM_VIEWS: readonly CharmView[] = ['boxes', 'click', 'hover', 'open']

export function isCharmView(value: string | null): value is CharmView {
  return value !== null && (CHARM_VIEWS as readonly string[]).includes(value)
}

// Which group buttons is selected: every group, one group (by id), or Ungrouped.
export type CharmSelection = { kind: 'all' } | { kind: 'group'; id: string } | { kind: 'ungrouped' }

export const ALL: CharmSelection = { kind: 'all' }

export function sameSelection(a: CharmSelection, b: CharmSelection): boolean {
  if (a.kind !== b.kind) return false
  return a.kind !== 'group' || a.id === (b as { id: string }).id
}

// Where a layout starts: "always open" shows one group at a time so the panel
// stays short, so it opens on the first group (or All when there are none).
export function initialSelection(view: CharmView, groups: CharmGroup[]): CharmSelection {
  if (view === 'open' && groups.length > 0) return { kind: 'group', id: groups[0].id }
  return ALL
}

export interface CharmSection {
  group: CharmGroup | null   // null = Ungrouped
  charms: CharacterCharm[]
}

// The sections to show for a selection, groups in their order then Ungrouped.
// Empty sections are left out under All. A selection that no longer exists (its
// group was deleted, or Ungrouped emptied) falls back to All, so the panel is
// never blank while charms exist.
export function visibleSections(
  grouped: { group: CharmGroup; charms: CharacterCharm[] }[],
  ungrouped: CharacterCharm[],
  selection: CharmSelection,
): { selection: CharmSelection; sections: CharmSection[] } {
  if (selection.kind === 'group') {
    const hit = grouped.find(g => g.group.id === selection.id)
    if (hit) return { selection, sections: [{ group: hit.group, charms: hit.charms }] }
  }
  if (selection.kind === 'ungrouped' && ungrouped.length > 0) {
    return { selection, sections: [{ group: null, charms: ungrouped }] }
  }
  const sections: CharmSection[] = grouped
    .filter(g => g.charms.length > 0)
    .map(g => ({ group: g.group, charms: g.charms }))
  if (ungrouped.length > 0) sections.push({ group: null, charms: ungrouped })
  return { selection: ALL, sections }
}
