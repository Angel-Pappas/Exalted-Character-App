import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Shared modal wrapper: renders children into document.body (so fixed overlays
// escape any transformed/positioned ancestor), locks background page scroll while
// any modal is mounted, and closes the top-most modal on Escape.
//
// Pass `onClose` to opt a modal into Escape-to-close (same handler used by its
// overlay-click / ✕ button). Both the scroll lock and the Escape stack are
// ref-counted, so nested/stacked modals behave correctly: scrolling is restored
// only when the last modal closes, and Escape only dismisses the top-most one.
let lockCount = 0
let savedOverflow = ''
let savedPaddingRight = ''

function lockScroll() {
  if (lockCount === 0) {
    // Reserve the space the scrollbar occupied so hiding it doesn't let the
    // page reflow wider (which shifts the background content).
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    savedOverflow = document.body.style.overflow
    savedPaddingRight = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      const currentPad = parseFloat(getComputedStyle(document.body).paddingRight) || 0
      document.body.style.paddingRight = `${currentPad + scrollbarWidth}px`
    }
  }
  lockCount++
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow
    document.body.style.paddingRight = savedPaddingRight
  }
}

const closeStack: Array<() => void> = []

function handleKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || closeStack.length === 0) return
  e.stopPropagation()
  closeStack[closeStack.length - 1]()
}

export default function ModalPortal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  // Keep the latest onClose without re-registering the stack entry each render.
  // Written in an effect rather than during render: a render can be discarded before
  // it commits, and a ref written during one would keep the stale value.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    lockScroll()
    const entry = () => onCloseRef.current?.()
    closeStack.push(entry)
    if (closeStack.length === 1) document.addEventListener('keydown', handleKeydown)
    return () => {
      unlockScroll()
      const i = closeStack.lastIndexOf(entry)
      if (i !== -1) closeStack.splice(i, 1)
      if (closeStack.length === 0) document.removeEventListener('keydown', handleKeydown)
    }
  }, [])

  return createPortal(children, document.body)
}
