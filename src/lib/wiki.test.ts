import { describe, expect, it } from 'vitest'
import type { RichDoc, WikiKind, WikiPage } from '../types/wiki'
import {
  isEmptyDoc, linksIn, membersOf, mentionedIn, nameTaken, pagesIn, placeChain, placeOptions,
  placesWithin, placeTree, plainText, previewText, resolveLink, searchPages,
} from './wiki'

function page(id: string, kind: WikiKind, name: string, more: Partial<WikiPage> = {}): WikiPage {
  return { id, kind, name, place_id: null, group_ids: [], body: null, sections: [], image: null, updated_at: null, ...more }
}

const link = (id: string, label: string): RichDoc => ({ type: 'wikiLink', attrs: { id, label } })
const para = (...content: RichDoc[]): RichDoc => ({ type: 'paragraph', content })
const text = (t: string): RichDoc => ({ type: 'text', text: t })
const doc = (...content: RichDoc[]): RichDoc => ({ type: 'doc', content })

// The Realm ⊃ Nexus ⊃ Lower Market; the entourage and the 23rd Legion.
const realm = page('realm', 'place', 'The Realm')
const nexus = page('nexus', 'place', 'Nexus', { place_id: 'realm' })
const market = page('market', 'place', 'Lower Market', { place_id: 'nexus' })
const entourage = page('ent', 'group', 'Entourage')
const legion = page('leg', 'group', '23rd Legion', { place_id: 'nexus' })
const solaen = page('sol', 'person', 'Solaen', { place_id: 'nexus', group_ids: ['ent'] })
const blaque = page('bla', 'person', 'Blaque', { place_id: 'market', group_ids: ['ent', 'leg'] })
const maellia = page('mae', 'person', 'Maellia', { place_id: 'realm' })
const all = [realm, nexus, market, entourage, legion, solaen, blaque, maellia]

describe('resolveLink', () => {
  it('finds the page by id, and by name when the id is gone', () => {
    expect(resolveLink(all, 'sol', 'Old name')).toBe(solaen)
    expect(resolveLink(all, 'deleted', ' blaque ')).toBe(blaque)
    expect(resolveLink(all, 'deleted', 'Nobody')).toBeNull()
    expect(resolveLink(all, undefined, undefined)).toBeNull()
  })
})

describe('mentionedIn', () => {
  it('lists the pages linking here from their text or sections, never the page itself', () => {
    const a = page('a', 'person', 'Aruva', { body: doc(para(text('Owes '), link('bla', 'Blaque'))) })
    const b = page('b', 'person', 'Dovestone', { sections: [{ id: 's', title: 'Past', body: doc(para(link('gone', 'blaque'))) }] })
    const self = { ...blaque, body: doc(para(link('bla', 'Blaque'))) }
    const pages = [a, b, self, solaen]
    expect(mentionedIn(pages, self).map(p => p.name)).toEqual(['Aruva', 'Dovestone'])
    expect(linksIn(a.body)).toEqual([{ id: 'bla', label: 'Blaque' }])
  })
})

describe('places', () => {
  it('walks out from a place, outermost first', () => {
    expect(placeChain(all, 'market').map(p => p.name)).toEqual(['The Realm', 'Nexus', 'Lower Market'])
    expect(placeChain(all, null)).toEqual([])
  })

  it('stops at a loop instead of hanging', () => {
    const a = page('a', 'place', 'A', { place_id: 'b' })
    const b = page('b', 'place', 'B', { place_id: 'a' })
    expect(placeChain([a, b], 'a').map(p => p.name)).toEqual(['B', 'A'])
    expect(placesWithin([a, b], 'a').map(p => p.name)).toEqual(['B'])
  })

  it('lists the people in a place and in the places inside it, saying where', () => {
    expect(pagesIn(all, 'nexus', 'person').map(r => [r.page.name, r.at?.name ?? null]))
      .toEqual([['Blaque', 'Lower Market'], ['Solaen', null]])
    expect(pagesIn(all, 'realm', 'person').map(r => r.page.name)).toEqual(['Blaque', 'Maellia', 'Solaen'])
    expect(pagesIn(all, 'nexus', 'group').map(r => r.page.name)).toEqual(['23rd Legion'])
    expect(pagesIn(all, 'market', 'place')).toEqual([])
  })

  it('lists places as a tree', () => {
    const port = page('port', 'place', 'Port Calin')
    expect(placeTree([...all, port]).map(r => `${r.depth}:${r.page.name}`))
      .toEqual(['0:Port Calin', '0:The Realm', '1:Nexus', '2:Lower Market'])
    const a = page('a', 'place', 'A', { place_id: 'b' })
    const b = page('b', 'place', 'B', { place_id: 'a' })
    expect(placeTree([a, b]).map(r => `${r.depth}:${r.page.name}`)).toEqual(['0:A', '1:B'])
  })

  it("never offers a place inside itself or inside one of its own places", () => {
    expect(placeOptions(all, realm).map(p => p.name)).toEqual([])
    expect(placeOptions(all, market).map(p => p.name)).toEqual(['Nexus', 'The Realm'])
    expect(placeOptions(all, solaen).map(p => p.name)).toEqual(['Lower Market', 'Nexus', 'The Realm'])
  })
})

describe('membersOf', () => {
  it('lists people first, then other pages, each by name', () => {
    const hall = page('hall', 'place', 'Abbey', { group_ids: ['ent'] })
    expect(membersOf([...all, hall], 'ent').map(p => p.name)).toEqual(['Blaque', 'Solaen', 'Abbey'])
  })
})

describe('text', () => {
  const body = doc(
    para(text('Met '), link('sol', 'Sol'), text(' at the docks.')),
    { type: 'bulletList', content: [{ type: 'listItem', content: [para(text('Owes a favour'))] }] },
  )

  it("reads a document's text, with links as their page's current name", () => {
    expect(plainText(body, all)).toBe('Met Solaen at the docks.\nOwes a favour')
    expect(plainText(null)).toBe('')
  })

  it('cuts a long preview at a word', () => {
    const long = page('x', 'person', 'X', { body: doc(para(text('word '.repeat(100)))) })
    const preview = previewText(long, all, 50)
    expect(preview.endsWith('word…')).toBe(true)
    expect(preview.length).toBeLessThanOrEqual(51)
    expect(previewText({ ...long, body }, all)).toBe('Met Solaen at the docks. Owes a favour')
  })

  it('knows an empty document', () => {
    expect(isEmptyDoc(null)).toBe(true)
    expect(isEmptyDoc(doc(para()))).toBe(true)
    expect(isEmptyDoc(body)).toBe(false)
  })
})

describe('search and names', () => {
  it('puts names starting with the query first', () => {
    expect(searchPages(all, 'ex').map(p => p.name)).toEqual(['Nexus'])
    expect(searchPages(all, 'l').map(p => p.name)).toEqual(['Lower Market', '23rd Legion', 'Blaque', 'Maellia', 'Solaen', 'The Realm'])
    expect(searchPages(all, '  ')).toHaveLength(all.length)
  })

  it('treats names as the same whatever their case', () => {
    expect(nameTaken(all, ' NEXUS ')).toBe(true)
    expect(nameTaken(all, 'Nexus', 'nexus')).toBe(false)
  })
})
