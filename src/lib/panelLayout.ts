import type { PanelLayout } from '../types/character'

// Sheet grid geometry: every row is ROW_HEIGHT px, with no margins between items.
export const ROW_HEIGHT = 10

// Grid rows a panel needs to show `contentPx` of content without scrolling,
// where `chromePx` is the panel's own padding and borders around that content.
export function rowsToFit(contentPx: number, chromePx: number, minRows: number): number {
  return Math.max(minRows, Math.ceil((contentPx + chromePx) / ROW_HEIGHT))
}

// Sets one panel's height and moves every panel below it that shares any of its
// columns by the same amount, so growing never overlaps what sits underneath and
// shrinking never leaves a widening gap. Panels beside it are untouched.
export function fitPanelHeight(layout: PanelLayout[], id: string, h: number): PanelLayout[] {
  const panel = layout.find(l => l.i === id)
  if (!panel || panel.h === h) return layout
  const delta = h - panel.h
  const oldBottom = panel.y + panel.h
  return layout.map(l => {
    if (l.i === id) return { ...l, h }
    const sharesColumn = l.x < panel.x + panel.w && panel.x < l.x + l.w
    return sharesColumn && l.y >= oldBottom ? { ...l, y: Math.max(0, l.y + delta) } : l
  })
}

// A layout the grid reports back (after a drag or resize, and also whenever it
// catches up with a layout it was given), applied to the current one. Only
// position and size are kept. A panel whose height follows its content keeps
// the height it has now: the grid's copy can be one fit behind, and taking it
// would undo the fit and make the panel jump between the two heights. Returns
// `current` itself when nothing changed, so an echo costs no save.
export function gridLayoutChange(current: PanelLayout[], reported: readonly PanelLayout[], fittedId: string): PanelLayout[] {
  const fitted = current.find(l => l.i === fittedId)
  const next = reported.map(({ i, x, y, w, h }) => ({ i, x, y, w, h: i === fittedId && fitted ? fitted.h : h }))
  const same = next.length === current.length && next.every(n => {
    const c = current.find(l => l.i === n.i)
    return c !== undefined && c.x === n.x && c.y === n.y && c.w === n.w && c.h === n.h
  })
  return same ? current : next
}
