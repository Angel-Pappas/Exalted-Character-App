import { Link } from 'react-router-dom'
import { CHARACTER_TABS, tabPath, type CharacterTab } from '../lib/characterTabs'

interface TabBarProps {
  characterId: string
  active: CharacterTab
  // Only these tabs are offered (e.g. just the sheet when viewing someone else's character).
  only?: CharacterTab[]
}

// Sits inside the page header: it stretches to the header's full height so the
// active tab's underline lands on the header's bottom border. The tabs are links,
// so a middle-click opens one in a new browser tab.
export default function TabBar({ characterId, active, only }: TabBarProps) {
  return (
    <nav className="flex self-stretch shrink-0" aria-label="Character">
      {CHARACTER_TABS.filter(tab => !only || only.includes(tab.id)).map(tab => (
        <Link
          key={tab.id}
          to={tabPath(characterId, tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
          className={`flex items-center px-2.5 md:px-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
            active === tab.id
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-100'
          }`}
        >
          <span className="md:hidden">{tab.short}</span>
          <span className="hidden md:inline">{tab.label}</span>
        </Link>
      ))}
    </nav>
  )
}
