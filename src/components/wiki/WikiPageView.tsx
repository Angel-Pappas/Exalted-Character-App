import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Trash2, X } from 'lucide-react'
import {
  KIND_LABEL, KINDS, isEmptyDoc, membersOf, mentionedIn, nameTaken, pagesIn, placeChain, placeOptions, sortByName,
} from '../../lib/wiki'
import type { WikiKind, WikiPage, WikiSection } from '../../types/wiki'
import { KindIcon, PageLink } from './PageLink'
import { useWiki } from './WikiContext'
import WikiEditor from './WikiEditor'

const inputCls = 'bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500'
const iconBtn = 'p-1 rounded text-stone-500 hover:text-stone-100 hover:bg-stone-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent'

/** A derived list under the text: people here, members, mentioned in… */
function LinkList({ title, items }: { title: string; items: { page: WikiPage; note?: string }[] }) {
  if (!items.length) return null
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1.5">{title}</h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {items.map(({ page, note }) => (
          <li key={page.id} className="flex items-center gap-1">
            <KindIcon kind={page.kind} className="w-3 h-3 text-stone-500 shrink-0" />
            <PageLink page={page} />
            {note && <span className="text-xs text-stone-500">· {note}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The page's image: shown when reading, with Add / Replace / Remove while editing. */
function ImageBox({ page, editing, onUpload, onRemove }: {
  page: WikiPage
  editing: boolean
  onUpload: (file: File) => Promise<string | null>
  onRemove: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!page.image && !editing) return null

  async function pick(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(await onUpload(file))
    setBusy(false)
  }

  return (
    <aside className="md:w-56 shrink-0 space-y-1.5">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={e => { void pick(e.target.files?.[0]); e.target.value = '' }} />
      {page.image ? (
        <img src={page.image} alt={page.name} className="w-full max-h-80 object-contain rounded-lg border border-stone-700 bg-stone-900" />
      ) : (
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          className="w-full h-32 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-stone-600 text-stone-500 hover:text-stone-200 hover:border-stone-400 text-xs transition-colors">
          <ImagePlus className="w-5 h-5" aria-hidden />{busy ? 'Uploading…' : 'Add an image'}
        </button>
      )}
      {editing && page.image && (
        <div className="flex gap-3 text-xs">
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="text-stone-400 hover:text-stone-100">{busy ? 'Uploading…' : 'Replace'}</button>
          <button type="button" onClick={onRemove} disabled={busy} className="text-stone-400 hover:text-red-400">Remove</button>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </aside>
  )
}

/**
 * One page, read like a Wikipedia article: what it is and where, its groups,
 * the text and sections, then what the wiki knows around it (who is here, the
 * members, what mentions it). Edit turns the same layout into fields.
 */
export default function WikiPageView({ page, editing, status, onEdit, onChange, onDelete, onUpload, onRemoveImage }: {
  page: WikiPage
  editing: boolean
  status: React.ReactNode
  onEdit: (on: boolean) => void
  onChange: (page: WikiPage) => void
  onDelete: () => void
  onUpload: (file: File) => Promise<string | null>
  onRemoveImage: () => void
}) {
  const { pages } = useWiki()
  const [name, setName] = useState(page.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const nameError = !name.trim() ? 'A page needs a name.' : nameTaken(pages, name, page.id) ? 'There is already a page called that.' : null

  const chain = placeChain(pages, page.place_id)
  const groups = sortByName(pages.filter(p => page.group_ids.includes(p.id)))
  const setSections = (sections: WikiSection[]) => onChange({ ...page, sections })
  const nothingWritten = isEmptyDoc(page.body) && page.sections.every(s => isEmptyDoc(s.body) && !s.title)

  const placeLabel = page.kind === 'person' ? 'Now in' : page.kind === 'place' ? 'Inside' : 'Based in'

  return (
    <article className="max-w-5xl space-y-5">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          {editing ? (
            <>
              <input value={name} aria-label="Name" onChange={e => {
                const next = e.target.value
                setName(next)
                if (next.trim() && !nameTaken(pages, next, page.id)) onChange({ ...page, name: next.trim() })
              }} className={`${inputCls} w-full text-xl font-semibold`} />
              {nameError && <p className="text-xs text-red-400">{nameError}</p>}
            </>
          ) : (
            <h1 className="text-2xl font-semibold text-stone-100 break-words">{page.name}</h1>
          )}

          {editing ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <label className="flex items-center gap-1.5 text-stone-400">Kind
                <select value={page.kind} onChange={e => onChange({ ...page, kind: e.target.value as WikiKind })} className={inputCls}>
                  {KINDS.map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-stone-400">{placeLabel}
                <select value={page.place_id ?? ''} onChange={e => onChange({ ...page, place_id: e.target.value || null })} className={`${inputCls} max-w-full`}>
                  <option value="">— nowhere set —</option>
                  {placeOptions(pages, page).map(p => <option key={p.id} value={p.id}>{placeChain(pages, p.id).map(c => c.name).join(' › ')}</option>)}
                </select>
              </label>
            </div>
          ) : (
            <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-stone-400">
              <KindIcon kind={page.kind} />
              <span>{KIND_LABEL[page.kind]}</span>
              {chain.length > 0 && <>
                <span>· {placeLabel.toLowerCase()}</span>
                {chain.map((p, i) => <span key={p.id} className="flex items-center gap-1.5">{i > 0 && <span className="text-stone-600">›</span>}<PageLink page={p} /></span>)}
              </>}
            </p>
          )}

          {(groups.length > 0 || editing) && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {groups.map(g => (
                <span key={g.id} className="flex items-center gap-1 rounded-full border border-stone-600 bg-stone-800 pl-2 pr-1.5 py-0.5">
                  <KindIcon kind="group" className="w-3 h-3 text-stone-500" />
                  <PageLink page={g} className="text-stone-200 hover:text-amber-400" />
                  {editing && (
                    <button type="button" aria-label={`Leave ${g.name}`} data-tip={`Take out of ${g.name}`}
                      onClick={() => onChange({ ...page, group_ids: page.group_ids.filter(id => id !== g.id) })}
                      className="text-stone-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                  )}
                </span>
              ))}
              {editing && (() => {
                const free = sortByName(pages.filter(p => p.kind === 'group' && p.id !== page.id && !page.group_ids.includes(p.id)))
                return free.length > 0 ? (
                  <select value="" aria-label="Add to a group" onChange={e => e.target.value && onChange({ ...page, group_ids: [...page.group_ids, e.target.value] })}
                    className={`${inputCls} text-xs py-0.5`}>
                    <option value="">+ Add to a group…</option>
                    {free.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                ) : <span className="text-stone-500">{groups.length ? '' : 'No groups yet — make one with “+ New”.'}</span>
              })()}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 pt-1">
          {status}
          <button type="button" onClick={() => onEdit(!editing)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${editing
              ? 'bg-amber-500 text-stone-950 hover:bg-amber-400'
              : 'bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-600'}`}>
            {editing ? 'Done' : <><Pencil className="w-3 h-3" aria-hidden />Edit</>}
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row-reverse gap-6 items-start">
        <ImageBox page={page} editing={editing} onUpload={onUpload} onRemove={onRemoveImage} />

        <div className="min-w-0 flex-1 w-full space-y-6">
          {!editing && nothingWritten ? (
            <p className="text-sm text-stone-500 italic">Nothing written yet. Press Edit to start.</p>
          ) : (
            <>
              {(editing || !isEmptyDoc(page.body)) && (
                <WikiEditor key={`${page.id}-body`} content={page.body} editable={editing}
                  onChange={body => onChange({ ...page, body })} />
              )}
              {page.sections.map((section, i) => (
                <section key={section.id} className="space-y-2">
                  {editing ? (
                    <div className="flex items-center gap-1">
                      <input value={section.title ?? ''} placeholder="Section title (e.g. History, Secrets)" aria-label="Section title"
                        onChange={e => setSections(page.sections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))}
                        className={`${inputCls} flex-1 font-semibold`} />
                      <button type="button" className={iconBtn} aria-label="Move up" data-tip="Move up" disabled={i === 0}
                        onClick={() => setSections(swap(page.sections, i, i - 1))}><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button type="button" className={iconBtn} aria-label="Move down" data-tip="Move down" disabled={i === page.sections.length - 1}
                        onClick={() => setSections(swap(page.sections, i, i + 1))}><ArrowDown className="w-3.5 h-3.5" /></button>
                      <RemoveSection onRemove={() => setSections(page.sections.filter(s => s.id !== section.id))} />
                    </div>
                  ) : (
                    section.title && <h2 className="text-lg font-semibold text-stone-100 border-b border-stone-700 pb-1">{section.title}</h2>
                  )}
                  {(editing || !isEmptyDoc(section.body)) && (
                    <WikiEditor key={section.id} content={section.body} editable={editing}
                      placeholder="Write this section…"
                      onChange={body => setSections(page.sections.map(s => s.id === section.id ? { ...s, body } : s))} />
                  )}
                </section>
              ))}
              {editing && (
                <button type="button" onClick={() => setSections([...page.sections, { id: crypto.randomUUID(), title: '', body: null }])}
                  className="text-xs text-stone-400 hover:text-amber-400">+ Add a section</button>
              )}
            </>
          )}

          <Related page={page} />

          {editing && (
            <div className="pt-4 border-t border-stone-800">
              <button type="button" onClick={() => confirmDelete ? onDelete() : setConfirmDelete(true)} onBlur={() => setConfirmDelete(false)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${confirmDelete ? 'text-red-400 font-semibold' : 'text-stone-500 hover:text-red-400'}`}>
                <Trash2 className="w-3.5 h-3.5" aria-hidden />{confirmDelete ? 'Click again to delete this page' : 'Delete page'}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

function RemoveSection({ onRemove }: { onRemove: () => void }) {
  const [sure, setSure] = useState(false)
  return (
    <button type="button" className={`${iconBtn} ${sure ? 'text-red-400' : ''}`} aria-label="Remove section"
      data-tip={sure ? 'Click again to remove this section' : 'Remove section'}
      onClick={() => sure ? onRemove() : setSure(true)} onBlur={() => setSure(false)}>
      <X className="w-3.5 h-3.5" />
    </button>
  )
}

/** What the wiki knows around this page, worked out from the other pages. */
function Related({ page }: { page: WikiPage }) {
  const { pages } = useWiki()
  const note = (at: WikiPage | null) => at ? `in ${at.name}` : undefined
  return (
    <div className="space-y-4">
      {page.kind === 'place' && <>
        <LinkList title="People here" items={pagesIn(pages, page.id, 'person').map(r => ({ page: r.page, note: note(r.at) }))} />
        <LinkList title="Groups here" items={pagesIn(pages, page.id, 'group').map(r => ({ page: r.page, note: note(r.at) }))} />
        <LinkList title="Places within" items={sortByName(pages.filter(p => p.kind === 'place' && p.place_id === page.id)).map(p => ({ page: p }))} />
      </>}
      {page.kind === 'group' && (
        <LinkList title="Members" items={membersOf(pages, page.id).map(p => ({ page: p, note: note(placeChain(pages, p.place_id).at(-1) ?? null) }))} />
      )}
      <LinkList title="Mentioned in" items={mentionedIn(pages, page).map(p => ({ page: p }))} />
    </div>
  )
}

