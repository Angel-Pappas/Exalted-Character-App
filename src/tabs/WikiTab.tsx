import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { api } from '../lib/api'
import { shrinkImage } from '../lib/imageResize'
import { KIND_LABEL, KIND_PLURAL, KINDS, nameTaken, placeChain, placeTree, searchPages } from '../lib/wiki'
import type { WikiKind, WikiPage } from '../types/wiki'
import { KindIcon, PageLink } from '../components/wiki/PageLink'
import { WikiContext, wikiPath, type WikiContextValue } from '../components/wiki/WikiContext'
import WikiPageView from '../components/wiki/WikiPageView'

/** How long typing must pause before a page is saved. */
const SAVE_DELAY_MS = 800

type SaveState = { state: 'idle' | 'saving' | 'saved' } | { state: 'error'; message: string }

/** The fields the server stores from a save (the image has its own route). */
function saveBody(page: WikiPage) {
  const { kind, name, place_id, group_ids, body, sections } = page
  return { kind, name, place_id, group_ids, body, sections }
}

/** The new-page form: what kind, and its name. */
function NewPageForm({ initialName, onCreate, onCancel }: {
  initialName: string
  onCreate: (kind: WikiKind, name: string) => Promise<string | null>
  onCancel: () => void
}) {
  const [kind, setKind] = useState<WikiKind>('person')
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  async function submit() {
    if (!name.trim()) return
    setError(await onCreate(kind, name.trim()))
  }
  return (
    <form className="space-y-2 rounded-lg border border-stone-700 bg-stone-900 p-2" onSubmit={e => { e.preventDefault(); void submit() }}>
      <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Kind of page">
        {KINDS.map(k => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
            className={`flex items-center justify-center gap-1 rounded px-1 py-1 text-xs transition-colors ${kind === k ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400 hover:text-stone-100'}`}>
            <KindIcon kind={k} className="w-3 h-3" />{KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <input autoFocus value={name} onChange={e => { setName(e.target.value); setError(null) }} placeholder="Name"
        onKeyDown={e => e.key === 'Escape' && onCancel()}
        className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500" />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-300 px-1">Cancel</button>
        <button type="submit" disabled={!name.trim()} className="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 px-3 py-1 rounded">Create</button>
      </div>
    </form>
  )
}

/** The list of every page: search, then People, Places (as a tree) and Groups. */
function PageList({ pages, currentId }: { pages: WikiPage[]; currentId?: string }) {
  const [query, setQuery] = useState('')
  const rowCls = (id: string) => `flex items-center gap-1.5 rounded px-2 py-1 text-sm truncate ${id === currentId ? 'bg-stone-800 text-amber-400' : 'text-stone-300 hover:bg-stone-800/60 hover:text-stone-100'}`

  if (query.trim()) {
    const hits = searchPages(pages, query)
    return (
      <div className="space-y-2">
        <SearchBox query={query} setQuery={setQuery} />
        {hits.length ? hits.map(p => (
          <PageLink key={p.id} page={p} className={rowCls(p.id)}><KindIcon kind={p.kind} className="w-3.5 h-3.5 shrink-0 text-stone-500" /><span className="truncate">{p.name}</span></PageLink>
        )) : <p className="px-2 text-xs text-stone-500">No page matches.</p>}
      </div>
    )
  }

  const tree = placeTree(pages)
  return (
    <div className="space-y-4">
      {pages.length > 6 && <SearchBox query={query} setQuery={setQuery} />}
      {KINDS.map(kind => {
        const rows = kind === 'place' ? tree : searchPages(pages.filter(p => p.kind === kind), '').map(page => ({ page, depth: 0 }))
        if (!rows.length) return null
        return (
          <section key={kind}>
            <h3 className="px-2 mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-stone-500">{KIND_PLURAL[kind]} <span className="text-stone-600">{rows.length}</span></h3>
            {rows.map(({ page, depth }) => {
              // A person's list row says where they are now, so who is where shows at a glance.
              const at = kind === 'person' ? placeChain(pages, page.place_id).at(-1)?.name : undefined
              return (
                <PageLink key={page.id} page={page} className={rowCls(page.id)}>
                  <span style={{ paddingLeft: `${depth * 0.75}rem` }} className="truncate">{page.name}</span>
                  {at && <span className="ml-auto pl-2 text-[11px] text-stone-500 truncate shrink-0 max-w-[45%]">{at}</span>}
                </PageLink>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}

function SearchBox({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  return (
    <label className="flex items-center gap-1.5 rounded border border-stone-700 bg-stone-900 px-2 py-1 focus-within:border-amber-500">
      <Search className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden />
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a page" aria-label="Find a page"
        className="w-full bg-transparent text-sm text-stone-100 placeholder-stone-500 focus:outline-none" />
    </label>
  )
}

/**
 * People & Places: this character's private wiki of the people, places and groups
 * it knows. Only the character's owner reads it. Every page is loaded at once;
 * edits show at once everywhere (links, lists) and save a moment after typing stops.
 */
export default function WikiTab({ characterId, pageId }: { characterId: string; pageId?: string }) {
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const newName = search.get('new')
  const [pages, setPages] = useState<WikiPage[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>({ state: 'idle' })

  // Saves waiting to go out, per page, so switching pages or leaving never drops one.
  const waiting = useRef(new Map<string, { page: WikiPage; timer: ReturnType<typeof setTimeout> }>())

  useEffect(() => {
    api<WikiPage[]>('GET', `characters/${characterId}/wiki`).then(({ data, error }) => {
      if (error) setLoadError(error)
      else setPages(data ?? [])
    })
  }, [characterId])

  const send = useCallback(async (page: WikiPage) => {
    const entry = waiting.current.get(page.id)
    if (entry) clearTimeout(entry.timer)
    waiting.current.delete(page.id)
    setSaveState({ state: 'saving' })
    const { error } = await api('PUT', `characters/${characterId}/wiki/${page.id}`, saveBody(page))
    setSaveState(error ? { state: 'error', message: error } : { state: 'saved' })
  }, [characterId])

  const flushAll = useCallback(() => {
    for (const { page } of waiting.current.values()) void send(page)
  }, [send])

  // Leaving the tab, or closing the browser tab, sends what is still waiting.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!waiting.current.size) return
      flushAll()
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => { window.removeEventListener('beforeunload', onBeforeUnload); flushAll() }
  }, [flushAll])

  function change(next: WikiPage) {
    setPages(prev => {
      if (!prev) return prev
      const before = prev.find(p => p.id === next.id)
      return prev.map(p => {
        if (p.id === next.id) return next
        // Mirrors the server: a page that stops being a place holds no one, one that
        // stops being a group has no members.
        let q = p
        if (before?.kind === 'place' && next.kind !== 'place' && q.place_id === next.id) q = { ...q, place_id: null }
        if (before?.kind === 'group' && next.kind !== 'group' && q.group_ids.includes(next.id)) q = { ...q, group_ids: q.group_ids.filter(id => id !== next.id) }
        return q
      })
    })
    const entry = waiting.current.get(next.id)
    if (entry) clearTimeout(entry.timer)
    waiting.current.set(next.id, { page: next, timer: setTimeout(() => void send(next), SAVE_DELAY_MS) })
    setSaveState({ state: 'idle' })
  }

  const createPage = useCallback(async (kind: WikiKind, name: string): Promise<WikiPage | null> => {
    const { data } = await api<WikiPage>('POST', `characters/${characterId}/wiki`, { kind, name })
    if (data) setPages(prev => [...(prev ?? []), data])
    return data
  }, [characterId])

  async function createFromForm(kind: WikiKind, name: string): Promise<string | null> {
    if (pages && nameTaken(pages, name)) return 'There is already a page called that.'
    const { data, error } = await api<WikiPage>('POST', `characters/${characterId}/wiki`, { kind, name })
    if (error || !data) return error ?? "Couldn't create the page."
    setPages(prev => [...(prev ?? []), data])
    setCreating(false)
    if (newName !== null) setSearch({}, { replace: true })
    setEditingId(data.id)
    navigate(wikiPath(characterId, data.id))
    return null
  }

  async function deletePage(page: WikiPage) {
    const entry = waiting.current.get(page.id)
    if (entry) clearTimeout(entry.timer)
    waiting.current.delete(page.id)
    const { error } = await api('DELETE', `characters/${characterId}/wiki/${page.id}`)
    if (error) { setSaveState({ state: 'error', message: error }); return }
    setPages(prev => (prev ?? []).filter(p => p.id !== page.id).map(p => ({
      ...p,
      place_id: p.place_id === page.id ? null : p.place_id,
      group_ids: p.group_ids.filter(id => id !== page.id),
    })))
    setEditingId(null)
    navigate(wikiPath(characterId), { replace: true })
  }

  async function uploadImage(page: WikiPage, file: File): Promise<string | null> {
    let blob: Blob
    try {
      blob = await shrinkImage(file)
    } catch {
      return "That file couldn't be read as an image."
    }
    const form = new FormData()
    form.append('image', blob, `image.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`)
    const { data, error } = await api<WikiPage>('POST', `characters/${characterId}/wiki/${page.id}/image`, form)
    if (error || !data) return error ?? "Couldn't upload the image."
    setPages(prev => (prev ?? []).map(p => p.id === page.id ? { ...p, image: data.image } : p))
    return null
  }

  async function removeImage(page: WikiPage) {
    const { error } = await api('DELETE', `characters/${characterId}/wiki/${page.id}/image`)
    if (error) { setSaveState({ state: 'error', message: error }); return }
    setPages(prev => (prev ?? []).map(p => p.id === page.id ? { ...p, image: null } : p))
  }

  const context = useMemo<WikiContextValue | null>(
    () => pages && { characterId, pages, createPage },
    [characterId, pages, createPage],
  )

  if (loadError) return <p className="p-6 text-sm text-red-400">{loadError}</p>
  if (!pages || !context) return <p className="p-6 text-sm text-stone-500">Loading…</p>

  const page = pageId ? pages.find(p => p.id === pageId) : undefined
  const showForm = creating || newName !== null
  const status = saveState.state === 'saving' ? <span className="text-xs text-stone-500" role="status">Saving…</span>
    : saveState.state === 'error' ? <span className="text-xs text-red-400" role="alert">{saveState.message}</span>
    : null

  return (
    <WikiContext.Provider value={context}>
      <div className="p-4 md:grid md:grid-cols-[15rem_1fr] md:gap-6 md:items-start">
        {/* On a phone the list and a page take turns; on a desktop the list stays beside the page. */}
        <nav aria-label="People & Places" className={`space-y-3 md:sticky md:top-[calc(var(--page-header-h,3.5rem)+1rem)] ${page ? 'hidden md:block' : ''}`}>
          {showForm ? (
            <NewPageForm key={newName ?? ''} initialName={newName ?? ''} onCreate={createFromForm}
              onCancel={() => { setCreating(false); if (newName !== null) setSearch({}, { replace: true }) }} />
          ) : (
            <button type="button" onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-xs font-medium text-stone-300 hover:text-stone-100">
              <Plus className="w-3.5 h-3.5" aria-hidden />New page
            </button>
          )}
          <PageList pages={pages} currentId={page?.id} />
        </nav>

        <div className="min-w-0">
          {page ? (
            <>
              <Link to={wikiPath(characterId)} className="md:hidden inline-block mb-3 text-sm text-stone-400 hover:text-stone-100">‹ All pages</Link>
              <WikiPageView
                key={page.id}
                page={page}
                editing={editingId === page.id}
                status={status}
                onEdit={on => { setEditingId(on ? page.id : null); if (!on) flushAll() }}
                onChange={change}
                onDelete={() => void deletePage(page)}
                onUpload={file => uploadImage(page, file)}
                onRemoveImage={() => void removeImage(page)}
              />
            </>
          ) : pageId ? (
            <p className="text-sm text-stone-500">That page doesn't exist any more.</p>
          ) : (
            <div className={`max-w-xl space-y-2 text-sm text-stone-400 ${pages.length ? 'hidden md:block' : ''}`}>
              <p>Your own wiki of the people, places and groups this character knows. Only you can read it.</p>
              <p className="text-stone-500">
                Give each person a place (where they are now) and their groups; a place then lists everyone in it, and a group
                its members. In any text, type <kbd className="px-1 rounded bg-stone-800 text-stone-300">[[</kbd> to link another page.
              </p>
              {!pages.length && <p className="text-stone-500">Start with “New page”.</p>}
            </div>
          )}
        </div>
      </div>
    </WikiContext.Provider>
  )
}
