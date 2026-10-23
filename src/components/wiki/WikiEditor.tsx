import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, ReactRenderer, useEditor, type NodeViewProps } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import { Placeholder } from '@tiptap/extensions'
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion'
import { Bold, Italic, Link2, List, ListOrdered } from 'lucide-react'
import { KIND_LABEL, KINDS, WIKI_LINK, linkText, nameTaken, resolveLink, searchPages } from '../../lib/wiki'
import type { RichDoc, WikiKind, WikiPage } from '../../types/wiki'
import { KindIcon, PageLink } from './PageLink'
import { useWiki, wikiPath, type WikiContextValue } from './WikiContext'

// The People & Places text editor (Tiptap). Typing [[ opens a list of pages to
// link; a name with no page yet can be made into one right there. A link points
// at the page itself (its id), so it shows the page's current name after a
// rename, opens it on click and previews it on hover. A link whose page is gone
// is red, like Wikipedia's, and clicking it starts a page with that name.

type Choice = { page: WikiPage } | { create: WikiKind; name: string }

/** How many pages the [[ list offers at once. */
const MAX_CHOICES = 8

function WikiLinkView({ node, editor }: NodeViewProps) {
  const { pages, characterId } = useWiki()
  const navigate = useNavigate()
  const label = typeof node.attrs.label === 'string' ? node.attrs.label : ''
  const page = resolveLink(pages, node.attrs.id, label)
  const shown = linkText(node.attrs, page)

  // While editing, a plain click places the cursor; Ctrl/⌘-click still follows the link.
  const stayWhileEditing = (e: React.MouseEvent) => {
    if (editor.isEditable && !e.ctrlKey && !e.metaKey) e.preventDefault()
  }

  return (
    <NodeViewWrapper as="span">
      {page ? (
        <PageLink page={page} onClick={stayWhileEditing}>{shown}</PageLink>
      ) : (
        <a
          href={`${wikiPath(characterId)}?new=${encodeURIComponent(label)}`}
          data-tip="No page yet — click to make one"
          className="text-red-400 hover:underline"
          onClick={e => {
            stayWhileEditing(e)
            if (!e.defaultPrevented && !e.ctrlKey && !e.metaKey) {
              e.preventDefault()
              navigate(`${wikiPath(characterId)}?new=${encodeURIComponent(label)}`)
            }
          }}
        >
          {shown}
        </a>
      )}
    </NodeViewWrapper>
  )
}

interface ChoiceListHandle { onKeyDown: (e: KeyboardEvent) => boolean }

const ChoiceList = forwardRef<ChoiceListHandle, { items: Choice[]; command: (c: Choice) => void; query: string }>(
  function ChoiceList({ items, command, query }, ref) {
    const [selected, setSelected] = useState(0)
    const [prevItems, setPrevItems] = useState(items)
    if (items !== prevItems) { setPrevItems(items); setSelected(0) }

    useImperativeHandle(ref, () => ({
      onKeyDown(e) {
        if (!items.length) return false
        if (e.key === 'ArrowDown') { setSelected(s => (s + 1) % items.length); return true }
        if (e.key === 'ArrowUp') { setSelected(s => (s + items.length - 1) % items.length); return true }
        if (e.key === 'Enter' || e.key === 'Tab') { command(items[selected]); return true }
        return false
      },
    }), [items, selected, command])

    return (
      <div className="w-64 max-h-72 overflow-y-auto rounded-lg border border-stone-600 bg-stone-900 shadow-2xl shadow-black/60 py-1 text-sm">
        {!items.length && <p className="px-3 py-1.5 text-xs text-stone-500">{query ? 'No match' : 'Type a name…'}</p>}
        {items.map((item, i) => (
          <button
            key={'page' in item ? item.page.id : `new-${item.create}`}
            type="button"
            onMouseDown={e => { e.preventDefault(); command(item) }}
            onMouseEnter={() => setSelected(i)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${i === selected ? 'bg-stone-700 text-stone-100' : 'text-stone-300'}`}
          >
            {'page' in item ? (
              <><KindIcon kind={item.page.kind} className="w-3.5 h-3.5 shrink-0 text-stone-500" /><span className="truncate">{item.page.name}</span></>
            ) : (
              <><KindIcon kind={item.create} className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span className="truncate">New {KIND_LABEL[item.create].toLowerCase()}: <span className="text-amber-400">{item.name}</span></span></>
            )}
          </button>
        ))}
      </div>
    )
  },
)

/** The [[ link: a Mention node of its own, with the page list as its suggestion. */
function wikiLinkExtension(wiki: () => WikiContextValue) {
  return Mention.extend({
    name: WIKI_LINK,
    addNodeView() { return ReactNodeViewRenderer(WikiLinkView) },
    // A link's own wording (see linkText); kept when the page is saved and loaded.
    addAttributes() {
      return { ...this.parent?.(), text: { default: null } }
    },
  }).configure({
    renderText: ({ node }) => String(node.attrs.text || node.attrs.label || ''),
    deleteTriggerWithBackspace: true,
    suggestion: {
      char: '[[',
      allowSpaces: true,
      allowedPrefixes: null,
      items: ({ query }): Choice[] => {
        const { pages } = wiki()
        const name = query.replace(/\]+$/, '').trim()
        const found: Choice[] = searchPages(pages, name).slice(0, MAX_CHOICES).map(page => ({ page }))
        if (!name || nameTaken(pages, name)) return found
        return [...found, ...KINDS.map(kind => ({ create: kind, name }))]
      },
      command: ({ editor, range, props }) => {
        const choice = props as unknown as Choice
        const attrs = 'page' in choice ? { id: choice.page.id, label: choice.page.name } : { id: null, label: choice.name }
        editor.chain().focus()
          .insertContentAt(range, [{ type: WIKI_LINK, attrs }, { type: 'text', text: ' ' }])
          .run()
        if ('page' in choice) return
        // A new page: the link goes in at once (found by its name meanwhile), and gets
        // the page's id when the server has made it, so a later rename keeps it.
        void wiki().createPage(choice.create, choice.name).then(page => {
          if (!page || editor.isDestroyed) return
          const tr = editor.state.tr
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === WIKI_LINK && !node.attrs.id && node.attrs.label === choice.name) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: page.id })
            }
          })
          if (tr.docChanged) editor.view.dispatch(tr)
        })
      },
      render: () => {
        let list: ReactRenderer<ChoiceListHandle> | null = null
        const place = (props: SuggestionProps) => {
          const rect = props.clientRect?.()
          const el = list?.element as HTMLElement | undefined
          if (!rect || !el) return
          el.style.position = 'fixed'
          el.style.zIndex = '1000'
          el.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 264))}px`
          const below = rect.bottom + 4
          el.style.top = below + 290 > window.innerHeight ? `${Math.max(8, rect.top - 4 - el.offsetHeight)}px` : `${below}px`
        }
        return {
          onStart: props => {
            list = new ReactRenderer(ChoiceList, { props, editor: props.editor })
            document.body.appendChild(list.element)
            place(props)
          },
          onUpdate: props => { list?.updateProps(props); place(props) },
          onKeyDown: (props: SuggestionKeyDownProps) => {
            if (props.event.key === 'Escape') { list?.destroy(); list?.element.remove(); list = null; return true }
            return list?.ref?.onKeyDown(props.event) ?? false
          },
          onExit: () => { list?.element.remove(); list?.destroy(); list = null },
        }
      },
    },
  })
}

function ToolButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} data-tip={label} onMouseDown={e => { e.preventDefault(); onClick() }}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-stone-700 text-amber-400' : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800'}`}>
      {children}
    </button>
  )
}

/**
 * Rich text with [[ links. Read-only unless `editable`; the toolbar shows only
 * while editing. Mount it with a `key` per document: the content is read once.
 */
export default function WikiEditor({ content, editable, onChange, placeholder }: {
  content: RichDoc | null
  editable: boolean
  onChange?: (doc: RichDoc) => void
  placeholder?: string
}) {
  const wikiValue = useWiki()
  const wiki = useRef(wikiValue)
  useEffect(() => { wiki.current = wikiValue })
  const changed = useRef(onChange)
  useEffect(() => { changed.current = onChange })

  // The extension reads the wiki through this getter, so its [[ list sees the latest pages.
  const getWiki = useCallback(() => wiki.current, [])
  const extensions = useMemo(() => [
    StarterKit.configure({ heading: false, code: false, codeBlock: false, horizontalRule: false, link: false }),
    Placeholder.configure({ placeholder: placeholder ?? 'Write here. Type [[ to link a person, place or group.' }),
    // eslint-disable-next-line react-hooks/refs -- getWiki reads the ref only inside the extension's callbacks (when [[ is typed), never during render
    wikiLinkExtension(getWiki),
  ], [placeholder, getWiki])

  const editor = useEditor({
    extensions,
    content: content ?? undefined,
    editable,
    onUpdate: ({ editor: e }) => changed.current?.(e.getJSON() as RichDoc),
    editorProps: { attributes: { class: 'wiki-prose focus:outline-none' } },
    // The toolbar shows which styles are on where the cursor is, so it follows every change.
    shouldRerenderOnTransaction: true,
  })

  // false: switching between reading and editing is not a change to save.
  useEffect(() => { editor?.setEditable(editable, false) }, [editor, editable])

  if (!editor) return null
  return (
    <div className={editable ? 'rounded-lg border border-stone-700 bg-stone-900 focus-within:border-amber-500/60' : undefined}>
      {editable && (
        <div className="flex items-center gap-0.5 border-b border-stone-700 px-1 py-0.5">
          <ToolButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-3.5 h-3.5" /></ToolButton>
          <ToolButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-3.5 h-3.5" /></ToolButton>
          <ToolButton label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-3.5 h-3.5" /></ToolButton>
          <ToolButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-3.5 h-3.5" /></ToolButton>
          <ToolButton label="Link a page (or type [[)" onClick={() => editor.chain().focus().insertContent('[[').run()}><Link2 className="w-3.5 h-3.5" /></ToolButton>
        </div>
      )}
      <EditorContent editor={editor} className={editable ? 'px-3 py-2 min-h-24' : undefined} />
    </div>
  )
}
