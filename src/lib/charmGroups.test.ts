import { describe, it, expect } from 'vitest'
import {
  DEFAULT_GROUP_COLOR, GROUP_COLORS, deleteGroup, editGroup, filterCharms, groupColor, isGroupColor, moveCharm, moveGroup, newGroup, partitionCharms,
} from './charmGroups'
import type { CharacterCharm, CharmGroup } from '../types/character'

const charm = (id: string, groupId?: string): CharacterCharm => ({
  id, libraryId: `lib-${id}`, name: `Charm ${id}`, libraryDescription: '', libraryModes: [], libraryMechanicalKey: null,
  customDescription: null, mechanicalKeyOverride: null, mechanicalEnabled: true, ...(groupId ? { groupId } : {}),
})
const group = (id: string): CharmGroup => ({ id, name: `Group ${id}`, color: 'amber' })

const ids = (cs: CharacterCharm[]) => cs.map(c => c.id)
const layout = (cs: CharacterCharm[]) => cs.map(c => `${c.id}:${c.groupId ?? '-'}`)

describe('partitionCharms — each charm shows in exactly one place', () => {
  const groups = [group('social'), group('combat')]
  const charms = [charm('a', 'combat'), charm('b'), charm('c', 'social'), charm('d', 'combat'), charm('e', 'gone')]
  const { grouped, ungrouped } = partitionCharms(charms, groups)

  it('lists groups in their own order, charms in array order', () => {
    expect(grouped.map(g => [g.group.id, ids(g.charms)])).toEqual([['social', ['c']], ['combat', ['a', 'd']]])
  })

  it('treats no group, or a group that no longer exists, as ungrouped', () => {
    expect(ids(ungrouped)).toEqual(['b', 'e'])
  })

  it('never drops or duplicates a charm', () => {
    const shown = [...grouped.flatMap(g => g.charms), ...ungrouped]
    expect(ids(shown).sort()).toEqual(ids(charms).sort())
  })

  it('keeps empty groups so they can still be dropped into', () => {
    expect(partitionCharms([], groups).grouped.map(g => g.charms.length)).toEqual([0, 0])
  })
})

describe('filterCharms', () => {
  const charms = [{ ...charm('a'), name: 'Ox-Body Technique' }, { ...charm('b'), name: 'Dazzling Flare' }]
  it('matches part of the name, ignoring case', () => expect(ids(filterCharms(charms, ' ox-b '))).toEqual(['a']))
  it('keeps everything for an empty query', () => expect(ids(filterCharms(charms, '  '))).toEqual(['a', 'b']))
})

describe('newGroup / editGroup', () => {
  it('trims the name', () => {
    expect(newGroup('g', '  Social ', 'violet')).toEqual({ id: 'g', name: 'Social', color: 'violet' })
  })

  it('refuses a blank name', () => expect(newGroup('g', '   ', 'amber')).toBeNull())

  it('edits only the named group, and a blank name keeps the old one', () => {
    const groups = [group('a'), group('b')]
    expect(editGroup(groups, 'a', { name: ' ', color: 'sky' })).toEqual([
      { id: 'a', name: 'Group a', color: 'sky' }, group('b'),
    ])
  })
})

describe('deleteGroup — never deletes charms', () => {
  const result = deleteGroup([group('a'), group('b')], [charm('1', 'a'), charm('2', 'b'), charm('3')], 'a')

  it('removes the group', () => expect(result.groups.map(g => g.id)).toEqual(['b']))

  it('makes its charms ungrouped and leaves the rest alone', () => {
    expect(layout(result.charms)).toEqual(['1:-', '2:b', '3:-'])
    expect('groupId' in result.charms[0]).toBe(false)
  })
})

describe('moveGroup', () => {
  const groups = [group('a'), group('b'), group('c')]
  const order = (gs: CharmGroup[]) => gs.map(g => g.id)

  it('moves before another group', () => expect(order(moveGroup(groups, 'c', 'a'))).toEqual(['c', 'a', 'b']))
  it('moves to the end with no target', () => expect(order(moveGroup(groups, 'a', null))).toEqual(['b', 'c', 'a']))
  it('does nothing when dropped on itself or unknown', () => {
    expect(moveGroup(groups, 'b', 'b')).toBe(groups)
    expect(moveGroup(groups, 'zzz', 'a')).toBe(groups)
  })
})

describe('moveCharm — drag a card into a group', () => {
  const charms = [charm('1', 'a'), charm('2', 'b'), charm('3', 'a'), charm('4')]

  it('drops at the end of the target group', () => {
    expect(layout(moveCharm(charms, '2', 'a'))).toEqual(['1:a', '3:a', '2:a', '4:-'])
  })

  it('drops just before another card, taking that card\'s group', () => {
    expect(layout(moveCharm(charms, '4', 'a', '1'))).toEqual(['4:a', '1:a', '2:b', '3:a'])
  })

  it('reorders within the same group', () => {
    expect(layout(moveCharm(charms, '3', 'a', '1'))).toEqual(['3:a', '1:a', '2:b', '4:-'])
  })

  it('ungroups with a null target', () => {
    const moved = moveCharm(charms, '1', null)
    expect(layout(moved)).toEqual(['2:b', '3:a', '4:-', '1:-'])
    expect('groupId' in moved[3]).toBe(false)
  })

  it('appends to an empty group', () => {
    expect(layout(moveCharm(charms, '4', 'new'))).toEqual(['1:a', '2:b', '3:a', '4:new'])
  })

  it('keeps everything else intact and the count unchanged', () => {
    const moved = moveCharm(charms, '2', 'a', '3')
    expect(moved).toHaveLength(charms.length)
    expect(moved.find(c => c.id === '2')).toEqual({ ...charms[1], groupId: 'a' })
  })

  it('does nothing for an unknown charm or a drop onto itself', () => {
    expect(moveCharm(charms, 'zzz', 'a')).toBe(charms)
    expect(moveCharm(charms, '1', 'a', '1')).toBe(charms)
  })
})

describe('group colours', () => {
  it('knows its own colours only', () => {
    expect(isGroupColor('violet')).toBe(true)
    expect(isGroupColor('toString')).toBe(false)
  })

  it('falls back to the default for an unknown stored colour', () => {
    expect(groupColor({ ...group('a'), color: 'plaid' })).toBe(GROUP_COLORS[DEFAULT_GROUP_COLOR])
  })
})
