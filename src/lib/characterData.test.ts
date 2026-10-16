import { describe, it, expect } from 'vitest'
import { applyChange } from './characterData'
import type { CharacterCharm, CharacterData, PanelLayout, SheetData } from '../types/character'

const charm = (id: string): CharacterCharm => ({
  id, libraryId: id, name: id, libraryDescription: '', libraryModes: [], libraryMechanicalKey: null,
  customDescription: null, mechanicalKeyOverride: null, mechanicalEnabled: true, count: 1,
})
const layout = (h: number): PanelLayout[] => [{ i: 'charms', x: 0, y: 0, w: 40, h }]
const data = (sheet: Partial<SheetData>): CharacterData =>
  ({ sheet: sheet as SheetData, milestones: [], notes: '', npcs: [] })

describe('applyChange', () => {
  // Angel, 2026-10-16: removing Integrity-Protecting Principle took its ledger
  // line away but left the charm on the sheet. The Charms panel then shrank and
  // saved its new height from a render that still held the charm, replacing the
  // whole sheet with that older copy.
  it('keeps a removed charm removed when a resize made from an older render lands after it', () => {
    const before = data({ charms: [charm('ipp'), charm('ox')], layout: layout(50) })
    const removed = applyChange(before, { sheet: { charms: [charm('ox')] }, milestones: [] })
    const resized = applyChange(removed, { sheet: { layout: layout(40) } })
    expect(resized.sheet.charms.map(c => c.id)).toEqual(['ox'])
    expect(resized.sheet.layout).toEqual(layout(40))
  })

  it('leaves the parts of the data a change does not name alone', () => {
    const before = { ...data({ charms: [charm('ox')], layout: layout(50) }), notes: 'kept' }
    const after = applyChange(before, { milestones: [] })
    expect(after.sheet).toBe(before.sheet)
    expect(after.notes).toBe('kept')
  })

  it('replaces a named sheet field as a whole', () => {
    const after = applyChange(data({ charms: [charm('a'), charm('b')] }), { sheet: { charms: [] } })
    expect(after.sheet.charms).toEqual([])
  })
})
