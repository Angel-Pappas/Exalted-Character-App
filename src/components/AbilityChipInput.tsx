import { useState } from 'react'

interface AbilityChipInputProps {
  abilities: string[]
  onChange: (abilities: string[]) => void
  suggestions: string[]
}

export default function AbilityChipInput({ abilities, onChange, suggestions }: AbilityChipInputProps) {
  const [draft, setDraft] = useState('')

  function addAbility(value: string) {
    const trimmed = value.trim()
    if (!trimmed || abilities.includes(trimmed)) return
    onChange([...abilities, trimmed])
    setDraft('')
  }

  function removeAbility(value: string) {
    onChange(abilities.filter(a => a !== value))
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-1">
        {abilities.map(a => (
          <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-900/40 border border-amber-700 text-amber-200 text-xs">
            {a}
            <button type="button" onClick={() => removeAbility(a)} title="Remove" className="text-amber-400 hover:text-amber-100">✕</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        list="ability-chip-suggestions"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addAbility(draft)
          }
        }}
        onBlur={() => { if (draft.trim()) addAbility(draft) }}
        placeholder="Type an ability and press Enter"
        className="w-full px-2 py-1 rounded bg-black/30 border border-gray-700 text-sm"
      />
      <datalist id="ability-chip-suggestions">
        {suggestions.filter(s => !abilities.includes(s)).map(s => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  )
}
