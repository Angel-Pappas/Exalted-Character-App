import { useState } from 'react'

// A button that asks for a second click before doing something hard to undo,
// instead of a browser confirm dialog. Clicking elsewhere disarms it.
export default function ConfirmButton({ label, confirmLabel, onConfirm, className }: {
  label: string
  confirmLabel: string
  onConfirm: () => void
  className: string
}) {
  const [armed, setArmed] = useState(false)
  return (
    <button type="button" onClick={() => { if (armed) { setArmed(false); onConfirm() } else setArmed(true) }}
      onBlur={() => setArmed(false)}
      className={`${className} ${armed ? 'text-red-400 border-red-500/60' : ''}`}>
      {armed ? confirmLabel : label}
    </button>
  )
}
