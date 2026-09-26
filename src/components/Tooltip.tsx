import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { placeTooltip } from '../lib/tooltipPosition'

// The character sheet's tooltips. Two ways in, one look:
//
//  - `data-tip="text"` on any element, for one-line hints. <TooltipLayer/> picks
//    these up with a single document listener, so an element opts in by swapping
//    `title` for `data-tip` — no wrapper element, so no layout change.
//  - <Tooltip content={…}> for rich content (the Defenses breakdown).
//
// Both render into document.body, so no panel's overflow or stacking can hide
// them, and both are positioned by placeTooltip, which keeps them in the window.
// Native `title` tooltips aren't used: they can't be styled and look out of place.

type Anchor = { el: Element; content: React.ReactNode }

/** How long the pointer must rest on a `data-tip` hint before it shows. */
const HINT_DELAY_MS = 300

function Bubble({ anchor, children }: { anchor: Element; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  // Positioned by writing styles directly: the size is only known after the bubble
  // renders, and measuring into state would cost a second render and a flicker.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { top, left } = placeTooltip(
      anchor.getBoundingClientRect(),
      { width: el.offsetWidth, height: el.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    )
    el.style.top = `${top}px`
    el.style.left = `${left}px`
    el.style.visibility = 'visible'
  })

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      style={{ visibility: 'hidden', top: 0, left: 0 }}
      className="tooltip-in fixed z-[1000] pointer-events-none max-w-xs rounded-lg border border-amber-500/30 bg-stone-900/95 px-3 py-2 text-xs leading-snug text-stone-200 shadow-2xl shadow-black/60 backdrop-blur-sm"
    >
      {children}
    </div>,
    document.body,
  )
}

// Anything that moves the page or starts an action hides the tooltip: its anchor
// may have scrolled away, or been deleted by the click (a ✕ button), in which case
// no pointerleave would ever arrive to close it.
function useHideOn(hide: () => void) {
  useEffect(() => {
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    window.addEventListener('pointerdown', hide, true)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
      window.removeEventListener('pointerdown', hide, true)
    }
  }, [hide])
}

/** Serves every `data-tip` hint on the page. Mount once. */
export function TooltipLayer() {
  const [active, setActive] = useState<Anchor | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const current = useRef<Element | null>(null)

  const hide = useCallback(() => {
    clearTimeout(timer.current)
    current.current = null
    setActive(null)
  }, [])
  useHideOn(hide)

  useEffect(() => {
    function onOver(e: Event) {
      const el = (e.target as Element | null)?.closest?.('[data-tip]') ?? null
      // Keyboard focus shows the hint; the focus a mouse click leaves behind doesn't,
      // or clicking ✎ would pop its hint back up straight after the click hid it.
      if (e.type === 'focusin' && !(e.target as Element).matches(':focus-visible')) return
      if (el === current.current) return
      clearTimeout(timer.current)
      current.current = el
      setActive(null)
      const text = el?.getAttribute('data-tip')
      if (!el || !text) return
      timer.current = setTimeout(() => setActive({ el, content: text }), HINT_DELAY_MS)
    }
    document.addEventListener('pointerover', onOver)
    document.addEventListener('focusin', onOver)
    document.addEventListener('focusout', hide)
    // Leaving the window fires no pointerover to clear the hint, so catch it here.
    document.documentElement.addEventListener('pointerleave', hide)
    return () => {
      clearTimeout(timer.current)
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('focusin', onOver)
      document.removeEventListener('focusout', hide)
      document.documentElement.removeEventListener('pointerleave', hide)
    }
  }, [hide])

  return active ? <Bubble anchor={active.el}>{active.content}</Bubble> : null
}

/** Wraps `children` in a div that shows `content` while hovered. Shows at once. */
export function Tooltip({ content, className, children }: {
  content: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const [anchor, setAnchor] = useState<Element | null>(null)
  const hide = useCallback(() => setAnchor(null), [])
  useHideOn(hide)

  return (
    <div
      className={className}
      onPointerEnter={e => setAnchor(e.currentTarget)}
      onPointerLeave={hide}
    >
      {children}
      {anchor && <Bubble anchor={anchor}>{content}</Bubble>}
    </div>
  )
}
