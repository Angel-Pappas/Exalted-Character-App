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

function lockScroll() {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount++
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow
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
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

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
