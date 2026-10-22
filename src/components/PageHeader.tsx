import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export interface Crumb {
  label: string
  to: string
}

interface PageHeaderProps {
  /** The pages above this one, outermost first. "Exalted" (home) is always first and added here. */
  crumbs?: Crumb[]
  /** This page's own name, shown last in the trail and in the browser tab. */
  title: string
  /** Replaces the title on screen (e.g. a rename box); the browser tab still uses `title`. */
  titleSlot?: React.ReactNode
  /** Shown after the title (e.g. "Solar Exalted · Dawn"). */
  subtitle?: React.ReactNode
  /** Everything else on the row: tabs, actions. */
  children?: React.ReactNode
}

/** Sets the browser tab's title, so several open tabs can be told apart. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Exalted` : 'Exalted'
  }, [title])
}

// The one header every page has. It stays at the top while the page scrolls, and
// its trail is made of real links, so a middle-click opens a page in a new tab and
// the browser's own Back button works as expected. On a phone the trail shortens
// to a single "‹ Parent" link.
export default function PageHeader({ crumbs = [], title, titleSlot, subtitle, children }: PageHeaderProps) {
  useDocumentTitle(title)
  const trail: Crumb[] = [{ label: 'Exalted', to: '/' }, ...crumbs]
  const parent = trail[trail.length - 1]
  const isHome = crumbs.length === 0 && title === 'Exalted'

  return (
    <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-sm border-b border-stone-700 shrink-0">
      <div className="flex flex-wrap md:flex-nowrap items-stretch gap-x-5 px-4 min-h-14">
        <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-none py-2.5">
          {!isHome && (
            <>
              <Link to={parent.to} className="md:hidden flex items-center gap-1 text-sm text-stone-400 hover:text-stone-100 shrink-0" aria-label={`Back to ${parent.label}`}>
                <span aria-hidden className="text-lg leading-none">‹</span>
              </Link>
              <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-2 text-sm shrink-0">
                {trail.map(c => (
                  <span key={c.to} className="flex items-center gap-2">
                    <Link to={c.to} className="text-stone-400 hover:text-stone-100 transition-colors">{c.label}</Link>
                    <span aria-hidden className="text-stone-600">/</span>
                  </span>
                ))}
              </nav>
            </>
          )}
          {titleSlot ?? <h1 className={`font-semibold text-amber-400 truncate ${isHome ? 'text-xl' : 'text-base'}`}>{title}</h1>}
          {subtitle && <span className="text-sm text-stone-400 truncate hidden sm:inline">{subtitle}</span>}
        </div>
        {children}
      </div>
    </header>
  )
}
