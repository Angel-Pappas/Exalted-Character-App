// People & Places: what the wiki works out from its pages — who is in a place,
// a group's members, what links to a page — and the text a hover preview shows.
// The server keeps the facts consistent (a page's place is a place, places never
// contain themselves); these functions still guard against loops, so a bad row
// can never hang the page.
import type { RichDoc, WikiKind, WikiPage } from '../types/wiki'

/** The editor's node for a link to another page; attrs `id` and `label` (the name when linked). */
export const WIKI_LINK = 'wikiLink'

export const KIND_LABEL: Record<WikiKind, string> = { person: 'Person', place: 'Place', group: 'Group' }
export const KIND_PLURAL: Record<WikiKind, string> = { person: 'People', place: 'Places', group: 'Groups' }
export const KINDS: WikiKind[] = ['person', 'place', 'group']

const byName = (a: WikiPage, b: WikiPage) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })

export function sortByName(pages: WikiPage[]): WikiPage[] {
  return [...pages].sort(byName)
}

/**
 * The page a link points to: by its id, or else by the name it was written with,
 * so a page deleted and made again under the same name heals its links.
 */
export function resolveLink(pages: WikiPage[], id: unknown, label: unknown): WikiPage | null {
  const exact = typeof id === 'string' ? pages.find(p => p.id === id) : undefined
  if (exact) return exact
  if (typeof label !== 'string') return null
  const name = label.trim().toLowerCase()
  return pages.find(p => p.name.toLowerCase() === name) ?? null
}

/** Every link in a document, in order. */
export function linksIn(doc: RichDoc | null | undefined): { id: unknown; label: unknown }[] {
  const found: { id: unknown; label: unknown }[] = []
  const walk = (node: RichDoc) => {
    if (node.type === WIKI_LINK) found.push({ id: node.attrs?.id, label: node.attrs?.label })
    node.content?.forEach(walk)
  }
  if (doc) walk(doc)
  return found
}

function docsOf(page: WikiPage): (RichDoc | null)[] {
  return [page.body, ...page.sections.map(s => s.body)]
}

/** The other pages that link to this one ("Mentioned in"), by name. */
export function mentionedIn(pages: WikiPage[], target: WikiPage): WikiPage[] {
  return sortByName(pages.filter(page => page.id !== target.id && docsOf(page).some(doc =>
    linksIn(doc).some(link => resolveLink(pages, link.id, link.label)?.id === target.id))))
}

/** The place and the places around it, outermost first: [The Realm, Nexus]. */
export function placeChain(pages: WikiPage[], placeId: string | null): WikiPage[] {
  const chain: WikiPage[] = []
  for (let at = placeId; at !== null;) {
    const place = pages.find(p => p.id === at && p.kind === 'place')
    if (!place || chain.includes(place)) break
    chain.unshift(place)
    at = place.place_id
  }
  return chain
}

/** Every place inside this one, at any depth. */
export function placesWithin(pages: WikiPage[], placeId: string): WikiPage[] {
  const inside: WikiPage[] = []
  const queue = [placeId]
  while (queue.length) {
    const at = queue.shift()
    for (const p of pages) {
      if (p.kind === 'place' && p.place_id === at && p.id !== placeId && !inside.includes(p)) {
        inside.push(p)
        queue.push(p.id)
      }
    }
  }
  return inside
}

/**
 * The people (or groups) in a place, including those in the places inside it.
 * `at` is where each one is exactly, for a "· in the Lower Market" note.
 */
export function pagesIn(pages: WikiPage[], placeId: string, kind: WikiKind): { page: WikiPage; at: WikiPage | null }[] {
  const within = placesWithin(pages, placeId)
  return sortByName(pages.filter(p => p.kind === kind && p.id !== placeId
    && (p.place_id === placeId || within.some(w => w.id === p.place_id))))
    .map(page => ({ page, at: page.place_id === placeId ? null : within.find(w => w.id === page.place_id) ?? null }))
}

/** The pages in a group, people first, then the rest, each by name. */
export function membersOf(pages: WikiPage[], groupId: string): WikiPage[] {
  const members = sortByName(pages.filter(p => p.group_ids.includes(groupId)))
  return [...members.filter(p => p.kind === 'person'), ...members.filter(p => p.kind !== 'person')]
}

/**
 * The places a page may sit in: every place, except the page itself and, for a
 * place, the ones inside it (which would make a loop).
 */
export function placeOptions(pages: WikiPage[], page: WikiPage): WikiPage[] {
  const inside = page.kind === 'place' ? placesWithin(pages, page.id) : []
  return sortByName(pages.filter(p => p.kind === 'place' && p.id !== page.id && !inside.includes(p)))
}

/** A document's text, paragraph by paragraph; links count as their page's current name. */
export function plainText(doc: RichDoc | null | undefined, pages: WikiPage[] = []): string {
  const blocks: string[] = []
  const inline = (node: RichDoc): string => {
    if (node.type === 'text') return node.text ?? ''
    if (node.type === WIKI_LINK) {
      const label = node.attrs?.label
      return resolveLink(pages, node.attrs?.id, label)?.name ?? (typeof label === 'string' ? label : '')
    }
    if (node.type === 'hardBreak') return ' '
    return (node.content ?? []).map(inline).join('')
  }
  const walk = (node: RichDoc) => {
    const isTextBlock = node.content?.some(c => c.type === 'text' || c.type === WIKI_LINK || c.type === 'hardBreak')
    if (isTextBlock) {
      const text = inline(node).trim()
      if (text) blocks.push(text)
    } else {
      node.content?.forEach(walk)
    }
  }
  if (doc) walk(doc)
  return blocks.join('\n')
}

/** The start of a page's text for a hover preview, cut at a word, like Wikipedia's. */
export function previewText(page: WikiPage, pages: WikiPage[], max = 280): string {
  const text = plainText(page.body, pages).replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, '')}…`
}

/** Pages whose name contains the query, those starting with it first. */
export function searchPages(pages: WikiPage[], query: string): WikiPage[] {
  const q = query.trim().toLowerCase()
  if (!q) return sortByName(pages)
  const hits = sortByName(pages.filter(p => p.name.toLowerCase().includes(q)))
  return [...hits.filter(p => p.name.toLowerCase().startsWith(q)), ...hits.filter(p => !p.name.toLowerCase().startsWith(q))]
}

/** Whether the name is free in this wiki (names are unique, ignoring case). */
export function nameTaken(pages: WikiPage[], name: string, exceptId?: string): boolean {
  const n = name.trim().toLowerCase()
  return pages.some(p => p.id !== exceptId && p.name.toLowerCase() === n)
}

/** A document with nothing written in it. */
export function isEmptyDoc(doc: RichDoc | null | undefined): boolean {
  return plainText(doc).trim() === '' && linksIn(doc).length === 0
}

/**
 * Places in tree order, each with how deep it sits: The Realm (0), Nexus (1),
 * Lower Market (2). A place whose surrounding place is missing starts a tree.
 */
export function placeTree(pages: WikiPage[]): { page: WikiPage; depth: number }[] {
  const places = sortByName(pages.filter(p => p.kind === 'place'))
  const out: { page: WikiPage; depth: number }[] = []
  const visit = (place: WikiPage, depth: number) => {
    if (out.some(o => o.page === place)) return
    out.push({ page: place, depth })
    places.filter(p => p.place_id === place.id).forEach(child => visit(child, depth + 1))
  }
  places.filter(p => !places.some(q => q.id === p.place_id)).forEach(root => visit(root, 0))
  // Places caught in a loop have no root; list them flat rather than lose them.
  places.forEach(p => visit(p, 0))
  return out
}
