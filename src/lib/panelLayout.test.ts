import { describe, it, expect } from 'vitest'
import { ROW_HEIGHT, fitPanelHeight, gridLayoutChange, rowsToFit, stackOrder } from './panelLayout'
import type { PanelLayout } from '../types/character'

const p = (i: string, x: number, y: number, w: number, h: number): PanelLayout => ({ i, x, y, w, h })

describe('rowsToFit', () => {
  it('rounds up so content is never cut off', () => {
    expect(rowsToFit(95, 22, 8)).toBe(12)          // 117px → 11.7 rows → 12
    expect(rowsToFit(98, 22, 8)).toBe(12)          // exactly 120px → 12
  })

  it('never goes below the minimum', () => expect(rowsToFit(0, 22, 8)).toBe(8))

  it('uses the sheet grid row height', () => expect(ROW_HEIGHT).toBe(10))
})

describe('fitPanelHeight — the Charms panel grows to fit its content', () => {
  // Charms above Effects in one column; Inventory beside them; a wide strip
  // below that overlaps Charms' columns only partly.
  const layout = [
    p('charms', 60, 0, 40, 46),
    p('effects', 60, 46, 40, 40),
    p('inventory', 100, 0, 28, 40),
    p('strip', 90, 90, 20, 5),
    p('above', 60, 0, 10, 0),
  ]
  const byId = (l: PanelLayout[]) => Object.fromEntries(l.map(x => [x.i, [x.y, x.h]]))

  it('pushes panels below it down by the growth', () => {
    expect(byId(fitPanelHeight(layout, 'charms', 60))).toEqual({
      charms: [0, 60], effects: [60, 40], inventory: [0, 40], strip: [104, 5], above: [0, 0],
    })
  })

  it('pulls them back up when it shrinks, keeping the gap the same', () => {
    expect(byId(fitPanelHeight(layout, 'charms', 30))).toMatchObject({ charms: [0, 30], effects: [30, 40], strip: [74, 5] })
  })

  it('leaves panels beside it alone', () => {
    expect(fitPanelHeight(layout, 'charms', 80).find(l => l.i === 'inventory')).toBe(layout[2])
  })

  it('returns the same layout when nothing changes, so no save is triggered', () => {
    expect(fitPanelHeight(layout, 'charms', 46)).toBe(layout)
    expect(fitPanelHeight(layout, 'missing', 10)).toBe(layout)
  })
})

describe('gridLayoutChange', () => {
  const layout = [p('charms', 60, 0, 40, 115), p('effects', 60, 115, 40, 40)]

  // 2026-10-16: the grid reported its copy from one fit earlier (charms at 100),
  // which undid the fit, which fitted again — the panel's bottom edge jumped
  // between the two heights for as long as the page was open.
  it('keeps the fitted panel at its current height when the grid reports an older one', () => {
    const next = gridLayoutChange(layout, [p('charms', 60, 0, 40, 100), p('effects', 60, 115, 40, 40)], 'charms')
    expect(next).toBe(layout)
  })

  it('takes moves and other resizes from the grid', () => {
    const next = gridLayoutChange(layout, [p('charms', 50, 0, 50, 100), p('effects', 60, 120, 40, 30)], 'charms')
    expect(next).toEqual([p('charms', 50, 0, 50, 115), p('effects', 60, 120, 40, 30)])
  })

  it('drops the grid’s extra fields', () => {
    const next = gridLayoutChange(layout, [{ ...p('charms', 60, 0, 40, 115), moved: false } as never, p('effects', 60, 116, 40, 40)], 'charms')
    expect(next[0]).toEqual(p('charms', 60, 0, 40, 115))
  })
})

describe('stackOrder — the phone view reads the desktop layout top to bottom', () => {
  it('orders panels by row, then left to right', () => {
    const layout = [p('charms', 76, 0, 52, 90), p('defenses', 0, 53, 13, 28), p('attributes', 0, 0, 14, 34), p('essence', 13, 53, 12, 28)]
    expect(stackOrder(layout)).toEqual(['attributes', 'charms', 'defenses', 'essence'])
  })
})
