import { useEffect, useRef, useState } from 'react'
import { phonePages, swipeTarget } from '../lib/phonePages'

// The page last looked at, kept while the browser tab is open, so switching to Notes
// and back (or reloading) returns to it.
const STORAGE_KEY = 'sheet-phone-page'

// The sheet on a phone: one page of panels at a time (see lib/phonePages), a bar of
// page names that stays under the header, and a sideways swipe to turn the page.
export default function PhoneSheet({ panels }: { panels: Record<string, React.ReactNode> }) {
  const pages = phonePages(Object.keys(panels))
  const [current, setCurrent] = useState(() => sessionStorage.getItem(STORAGE_KEY) ?? pages[0]?.id)
  const page = pages.find(p => p.id === current) ?? pages[0]
  const top = useRef<HTMLDivElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)

  function show(id: string) {
    setCurrent(id)
    sessionStorage.setItem(STORAGE_KEY, id)
  }

  // A new page starts at its top, just under the bar (only if scrolled past it).
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const el = top.current
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
  }, [page?.id])

  if (!page) return null

  return (
    <div ref={top} className="scroll-mt-[var(--page-header-h,0px)]">
      <nav aria-label="Sheet pages"
        className="sticky z-30 flex gap-0.5 px-1 py-1.5 bg-stone-950/95 backdrop-blur-sm border-b border-stone-700"
        style={{ top: 'var(--page-header-h, 0px)' }}>
        {pages.map(p => (
          <button key={p.id} onClick={() => show(p.id)}
            aria-current={p.id === page.id ? 'page' : undefined}
            className={`flex-1 min-w-0 whitespace-nowrap px-0.5 py-1.5 rounded-full text-[13px] font-medium ${
              p.id === page.id
                ? 'bg-amber-600 text-stone-950'
                : 'text-stone-300 hover:text-stone-100 bg-stone-900'
            }`}>
            {p.label}
          </button>
        ))}
      </nav>
      <div className="flex flex-col gap-1 p-1 pb-6 min-h-[60vh] [&>div>*]:!h-auto"
        onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
        onTouchEnd={e => {
          const start = touch.current
          touch.current = null
          if (!start) return
          const t = e.changedTouches[0]
          const target = swipeTarget(pages, page.id, t.clientX - start.x, t.clientY - start.y)
          if (target) show(target)
        }}>
        {page.panels.map(key => <div key={key}>{panels[key]}</div>)}
      </div>
    </div>
  )
}
