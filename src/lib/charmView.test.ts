import { describe, it, expect } from 'vitest'
import { ALL, initialSelection, isCharmView, sameSelection, visibleSections } from './charmView'
import { partitionCharms } from './charmGroups'
import type { CharacterCharm, CharmGroup } from '../types/character'

const charm = (id: string, groupId?: string): CharacterCharm => ({
  id, libraryId: `lib-${id}`, name: `Charm ${id}`, libraryDescription: '', libraryModes: [], libraryMechanicalKey: null,
  customDescription: null, mechanicalKeyOverride: null, mechanicalEnabled: true, ...(groupId ? { groupId } : {}),
})
const group = (id: string): CharmGroup => ({ id, name: `Group ${id}`, color: 'amber' })

const groups = [group('social'), group('combat'), group('empty')]
const charms = [charm('a', 'combat'), charm('b'), charm('c', 'social'), charm('d', 'combat')]
const { grouped, ungrouped } = partitionCharms(charms, groups)
const shown = (s: ReturnType<typeof visibleSections>) => s.sections.map(x => [x.group?.id ?? '-', x.charms.map(c => c.id)])

describe('visibleSections — what the group buttons show', () => {
  it('All lists every non-empty group in order, then Ungrouped', () => {
    expect(shown(visibleSections(grouped, ungrouped, ALL))).toEqual([['social', ['c']], ['combat', ['a', 'd']], ['-', ['b']]])
  })

  it('a group shows only its own charms', () => {
    const v = visibleSections(grouped, ungrouped, { kind: 'group', id: 'combat' })
    expect(shown(v)).toEqual([['combat', ['a', 'd']]])
    expect(v.selection).toEqual({ kind: 'group', id: 'combat' })
  })

  it('an empty group still shows (empty), so charms can be dropped into it', () => {
    expect(shown(visibleSections(grouped, ungrouped, { kind: 'group', id: 'empty' }))).toEqual([['empty', []]])
  })

  it('Ungrouped shows the charms in no group', () => {
    expect(shown(visibleSections(grouped, ungrouped, { kind: 'ungrouped' }))).toEqual([['-', ['b']]])
  })

  it('falls back to All when the chosen group is gone or Ungrouped is empty', () => {
    expect(visibleSections(grouped, ungrouped, { kind: 'group', id: 'deleted' }).selection).toEqual(ALL)
    expect(visibleSections(grouped, [], { kind: 'ungrouped' }).selection).toEqual(ALL)
  })
})

describe('initialSelection', () => {
  it('always-open starts on the first group, the compact layouts on All', () => {
    expect(initialSelection('open', groups)).toEqual({ kind: 'group', id: 'social' })
    expect(initialSelection('click', groups)).toEqual(ALL)
    expect(initialSelection('open', [])).toEqual(ALL)
  })
})

describe('sameSelection / isCharmView', () => {
  it('compares selections by kind and group id', () => {
    expect(sameSelection(ALL, { kind: 'all' })).toBe(true)
    expect(sameSelection({ kind: 'group', id: 'x' }, { kind: 'group', id: 'x' })).toBe(true)
    expect(sameSelection({ kind: 'group', id: 'x' }, { kind: 'group', id: 'y' })).toBe(false)
    expect(sameSelection(ALL, { kind: 'ungrouped' })).toBe(false)
  })

  it('accepts only the known layouts', () => {
    expect(isCharmView('click')).toBe(true)
    expect(isCharmView('wide')).toBe(false)
    expect(isCharmView(null)).toBe(false)
  })
})
