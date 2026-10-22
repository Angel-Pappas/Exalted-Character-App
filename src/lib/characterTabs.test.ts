import { describe, expect, it } from 'vitest'
import { tabFromPath, tabPath } from './characterTabs'

describe('character tab addresses', () => {
  it('gives the sheet the bare character address and every other tab its own segment', () => {
    expect(tabPath('abc', 'sheet')).toBe('/character/abc')
    expect(tabPath('abc', 'milestones')).toBe('/character/abc/milestones')
    expect(tabPath('abc', 'notes')).toBe('/character/abc/notes')
    expect(tabPath('abc', 'circle')).toBe('/character/abc/circle')
  })

  it('reads the tab back from the address, falling back to the sheet', () => {
    expect(tabFromPath(undefined)).toBe('sheet')
    expect(tabFromPath('milestones')).toBe('milestones')
    expect(tabFromPath('circle')).toBe('circle')
    expect(tabFromPath('nonsense')).toBe('sheet')
  })
})
