// The character sheet on a phone: instead of one long column of all eleven panels,
// the panels are grouped into a few pages by what they are used for. One page shows
// at a time; a bar of page names (and a sideways swipe) moves between them. Panels
// only ever stack one under another, never side by side (Angel, 2026-10-22).

export interface PhonePage {
  id: string
  label: string
  panels: string[]
}

const GROUPS: PhonePage[] = [
  { id: 'traits', label: 'Traits', panels: ['attributes', 'abilities'] },
  // What a fight needs: pools spent each turn, the health track, the defences.
  { id: 'combat', label: 'Combat', panels: ['essence', 'health', 'defenses'] },
  { id: 'charms', label: 'Charms', panels: ['charms'] },
  { id: 'gear', label: 'Gear', panels: ['inventory'] },
  { id: 'social', label: 'Social', panels: ['intimacies', 'merits', 'languages'] },
  { id: 'effects', label: 'Effects', panels: ['effects'] },
]

/** The pages for the panels the sheet has. A panel no group names gets a page of its own. */
export function phonePages(available: string[]): PhonePage[] {
  const has = new Set(available)
  const pages = GROUPS
    .map(g => ({ ...g, panels: g.panels.filter(p => has.has(p)) }))
    .filter(g => g.panels.length > 0)
  const grouped = new Set(GROUPS.flatMap(g => g.panels))
  for (const p of available) {
    if (!grouped.has(p)) pages.push({ id: p, label: p.charAt(0).toUpperCase() + p.slice(1), panels: [p] })
  }
  return pages
}

/** How far a finger must travel sideways, in px, before a swipe turns the page. */
export const SWIPE_MIN_PX = 60

/**
 * The page a swipe leads to, or null when it isn't a page turn: too short, more up
 * and down than sideways (scrolling), or past the first or last page. Swiping left
 * (dx < 0) goes to the next page, like turning a page in a book.
 */
export function swipeTarget(pages: PhonePage[], currentId: string, dx: number, dy: number): string | null {
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < 1.5 * Math.abs(dy)) return null
  const i = pages.findIndex(p => p.id === currentId)
  const next = pages[i + (dx < 0 ? 1 : -1)]
  return i >= 0 && next ? next.id : null
}
