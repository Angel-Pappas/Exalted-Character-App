import { describe, it, expect } from 'vitest'
import {
  DEFAULT_GROUP_COLOR, GROUP_COLORS, deleteGroup, editGroup, filterCharms, groupColor, isGroupColor, moveCharm, moveGroup, newGroup, partitionCharms,
  pinColumns, shorterColumn, splitColumns,
} from './charmGroups'
import type { CharacterCharm, CharmColumn, CharmGroup } from '../types/character'

const charm = (id: string, groupId?: string): CharacterCharm => ({
  id, libraryId: `lib-${id}`, name: `Charm ${id}`, libraryDescription: '', libraryModes: [], libraryMechanicalKey: null,
  customDescription: null, mechanicalKeyOverride: null, mechanicalEnabled: true, ...(groupId ? { groupId } : {}),
})
const col = (c: CharacterCharm, column: CharmColumn): CharacterCharm => ({ ...c, column })
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
  const result = deleteGroup([group('a'), group('b')], [col(charm('1', 'a'), 1), charm('2', 'b'), charm('3')], 'a')

  it('removes the group', () => expect(result.groups.map(g => g.id)).toEqual(['b']))

  it('makes its charms ungrouped and leaves the rest alone', () => {
    expect(layout(result.charms)).toEqual(['1:-', '2:b', '3:-'])
    expect('groupId' in result.charms[0]).toBe(false)
    expect('column' in result.charms[0]).toBe(false)
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

describe('splitColumns — two stacks per group', () => {
  const cols = (cs: CharacterCharm[]) => splitColumns(cs).map(ids)

  it('places unplaced cards in whichever column is shorter, ties left', () => {
    expect(cols([charm('1'), charm('2'), charm('3'), charm('4'), charm('5')])).toEqual([['1', '3', '5'], ['2', '4']])
  })

  it('respects a chosen column, so two short cards can stack beside a tall one', () => {
    expect(cols([col(charm('tall'), 0), col(charm('s1'), 1), col(charm('s2'), 1)])).toEqual([['tall'], ['s1', 's2']])
  })

  it('fills around chosen columns', () => {
    expect(cols([col(charm('a'), 1), charm('b'), charm('c'), charm('d')])).toEqual([['b', 'c'], ['a', 'd']])
  })

  it('shorterColumn picks the side with fewer cards', () => {
    expect(shorterColumn([charm('1')])).toBe(1)
    expect(shorterColumn([])).toBe(0)
  })
})

describe('pinColumns', () => {
  it('writes the on-screen column into every charm, per group', () => {
    const pinned = pinColumns([charm('1', 'a'), charm('2', 'a'), charm('3'), col(charm('4', 'a'), 0)], [group('a')])
    expect(pinned.map(c => `${c.id}:${c.column}`)).toEqual(['1:0', '2:1', '3:0', '4:0'])
  })

  it('leaves already-correct charms as the same objects', () => {
    const placed = col(charm('1'), 0)
    expect(pinColumns([placed], [])[0]).toBe(placed)
  })
})

describe('moveCharm — drag a card into a group column', () => {
  const groups = [group('a'), group('b')]
  const at = (cs: CharacterCharm[]) => cs.map(c => `${c.id}:${c.groupId ?? '-'}:${c.column}`)
  const charms = [col(charm('1', 'a'), 0), col(charm('2', 'b'), 0), col(charm('3', 'a'), 1), col(charm('4'), 0)]

  it('drops at the bottom of the chosen column', () => {
    expect(at(moveCharm(charms, groups, '2', { groupId: 'a', column: 0 }))).toEqual(['1:a:0', '3:a:1', '4:-:0', '2:a:0'])
  })

  it('drops just above another card, in that card\'s column', () => {
    const moved = moveCharm(charms, groups, '4', { groupId: 'a', column: 1, beforeId: '3' })
    expect(at(moved)).toEqual(['1:a:0', '2:b:0', '4:a:1', '3:a:1'])
    expect(splitColumns(partitionCharms(moved, groups).grouped[0].charms).map(ids)).toEqual([['1'], ['4', '3']])
  })

  it('moves between the columns of the same group', () => {
    expect(at(moveCharm(charms, groups, '1', { groupId: 'a', column: 1 }))).toEqual(['2:b:0', '3:a:1', '4:-:0', '1:a:1'])
  })

  it('pins the other cards so none of them hop columns', () => {
    const loose = [charm('1', 'a'), charm('2', 'a'), charm('3', 'a'), charm('x')]
    const before = splitColumns(loose.slice(0, 3)).map(ids)
    const moved = moveCharm(loose, groups, 'x', { groupId: 'a', column: 0, beforeId: '1' })
    const after = splitColumns(partitionCharms(moved, groups).grouped[0].charms).map(ids)
    expect(after).toEqual([['x', ...before[0]], before[1]])
  })

  it('ungroups with a null group', () => {
    const moved = moveCharm(charms, groups, '1', { groupId: null, column: 1 })
    expect(at(moved)).toEqual(['2:b:0', '3:a:1', '4:-:0', '1:-:1'])
    expect('groupId' in moved[3]).toBe(false)
  })

  it('keeps the count unchanged and everything else intact', () => {
    const moved = moveCharm(charms, groups, '2', { groupId: 'a', column: 1, beforeId: '3' })
    expect(moved).toHaveLength(charms.length)
    expect(moved.find(c => c.id === '2')).toEqual({ ...charms[1], groupId: 'a', column: 1 })
  })

  it('does nothing for an unknown charm or a drop onto itself', () => {
    expect(moveCharm(charms, groups, 'zzz', { groupId: 'a', column: 0 })).toBe(charms)
    expect(moveCharm(charms, groups, '1', { groupId: 'a', column: 0, beforeId: '1' })).toBe(charms)
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
