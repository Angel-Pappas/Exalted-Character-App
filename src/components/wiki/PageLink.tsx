import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, User, Users } from 'lucide-react'
import { Bubble } from '../Tooltip'
import { KIND_LABEL, placeChain, previewText } from '../../lib/wiki'
import type { WikiKind, WikiPage } from '../../types/wiki'
import { useWiki, wikiPath } from './WikiContext'

/** How long the pointer rests on a link before its preview opens (Wikipedia waits about as long). */
const PREVIEW_DELAY_MS = 450

export function KindIcon({ kind, className = 'w-3.5 h-3.5' }: { kind: WikiKind; className?: string }) {
  const Icon = kind === 'person' ? User : kind === 'place' ? MapPin : Users
  return <Icon className={className} aria-hidden />
}

/** The card a link shows on hover: image, what the page is, where, and how its text starts. */
export function PagePreview({ page }: { page: WikiPage }) {
  const { pages } = useWiki()
  const where = placeChain(pages, page.place_id).map(p => p.name).join(' › ')
  const text = previewText(page, pages)
  return (
    <div className="flex gap-3 w-80 max-w-full">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-stone-100">{page.name}</p>
        <p className="flex items-center gap-1 text-[11px] text-stone-400">
          <KindIcon kind={page.kind} className="w-3 h-3 shrink-0" />
          {KIND_LABEL[page.kind]}{where && ` · ${where}`}
        </p>
        {text ? <p className="text-xs text-stone-300 leading-relaxed">{text}</p>
          : <p className="text-xs text-stone-500 italic">Nothing written yet.</p>}
      </div>
      {page.image && <img src={page.image} alt="" className="w-20 h-20 object-cover rounded shrink-0 self-start" />}
    </div>
  )
}

/**
 * A link to a page that shows its preview after a moment's hover. Plain links,
 * so middle-click and Ctrl-click open a new browser tab.
 */
export function PageLink({ page, className, children, onClick }: {
  page: WikiPage
  className?: string
  children?: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}) {
  const { characterId } = useWiki()
  const [anchor, setAnchor] = useState<Element | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  function hide() {
    clearTimeout(timer.current)
    setAnchor(null)
  }

  return (
    <Link
      to={wikiPath(characterId, page.id)}
      className={className ?? 'text-amber-400 hover:underline'}
      onPointerEnter={e => {
        const el = e.currentTarget
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setAnchor(el), PREVIEW_DELAY_MS)
      }}
      onPointerLeave={hide}
      onClick={e => { hide(); onClick?.(e) }}
    >
      {children ?? page.name}
      {anchor && <Bubble anchor={anchor} wide><PagePreview page={page} /></Bubble>}
    </Link>
  )
}
