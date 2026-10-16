import type { CharacterCharm, CharmGroup } from '../types/character'

// Which of the Charms panel's group buttons is chosen: every group, one group
// (by id), or Ungrouped. Kept per visit, not saved.
export type CharmSelection = { kind: 'all' } | { kind: 'group'; id: string } | { kind: 'ungrouped' }

export const ALL: CharmSelection = { kind: 'all' }

export function sameSelection(a: CharmSelection, b: CharmSelection): boolean {
  if (a.kind !== b.kind) return false
  return a.kind !== 'group' || a.id === (b as { id: string }).id
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
