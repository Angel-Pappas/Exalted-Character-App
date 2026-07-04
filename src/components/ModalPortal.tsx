import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Shared modal wrapper: renders children into document.body (so fixed overlays
// escape any transformed/positioned ancestor) and locks background page scroll
// while any modal is mounted. Ref-counted so nested/stacked modals only restore
// scrolling once the last one closes.
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

export default function ModalPortal({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    lockScroll()
    return () => unlockScroll()
  }, [])
  return createPortal(children, document.body)
}
