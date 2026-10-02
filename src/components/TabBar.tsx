interface Tab {
  id: string
  label: string
}

const TABS: Tab[] = [
  { id: 'sheet', label: 'Character Sheet' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'notes', label: 'Notes' },
  { id: 'characters', label: 'Characters' },
]

interface TabBarProps {
  active: string
  onChange: (id: string) => void
  // Only these tabs are offered (e.g. just the sheet when viewing someone else's character).
  only?: string[]
}

// Sits inside the page header: it stretches to the header's full height so the
// active tab's underline lands on the header's bottom border.
export default function TabBar({ active, onChange, only }: TabBarProps) {
  return (
    <nav className="flex self-stretch shrink-0">
      {TABS.filter(tab => !only || only.includes(tab.id)).map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
          className={`flex items-center px-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
            active === tab.id
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
