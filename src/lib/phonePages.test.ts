import { describe, expect, it } from 'vitest'
import { phonePages, swipeTarget } from './phonePages'

const all = ['attributes', 'abilities', 'defenses', 'essence', 'health', 'merits', 'languages', 'intimacies', 'charms', 'effects', 'inventory']

describe('phonePages', () => {
  it('groups the eleven panels into six pages, in a fixed order', () => {
    const pages = phonePages(all)
    expect(pages.map(p => p.label)).toEqual(['Traits', 'Combat', 'Charms', 'Gear', 'Social', 'Effects'])
    expect(pages.find(p => p.id === 'combat')?.panels).toEqual(['essence', 'health', 'defenses'])
    expect(pages.flatMap(p => p.panels).sort()).toEqual([...all].sort())
  })

  it('leaves out panels the sheet lacks and drops a page left empty', () => {
    const pages = phonePages(['charms', 'attributes'])
    expect(pages).toEqual([
      { id: 'traits', label: 'Traits', panels: ['attributes'] },
      { id: 'charms', label: 'Charms', panels: ['charms'] },
    ])
  })

  it('gives a panel no group knows a page of its own, so nothing is ever hidden', () => {
    expect(phonePages(['charms', 'rituals']).map(p => p.id)).toEqual(['charms', 'rituals'])
    expect(phonePages(['rituals'])[0].label).toBe('Rituals')
  })
})

describe('swipeTarget', () => {
  const pages = phonePages(all)
  it('turns to the next page on a swipe left and the previous on a swipe right', () => {
    expect(swipeTarget(pages, 'combat', -80, 5)).toBe('charms')
    expect(swipeTarget(pages, 'combat', 80, 5)).toBe('traits')
  })

  it('ignores short moves and mostly-vertical ones (scrolling)', () => {
    expect(swipeTarget(pages, 'combat', -40, 0)).toBeNull()
    expect(swipeTarget(pages, 'combat', -80, 70)).toBeNull()
  })

  it('stops at the first and last page', () => {
    expect(swipeTarget(pages, 'traits', 100, 0)).toBeNull()
    expect(swipeTarget(pages, 'effects', -100, 0)).toBeNull()
  })
})
