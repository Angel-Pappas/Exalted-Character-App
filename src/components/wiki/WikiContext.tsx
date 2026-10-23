import { createContext, useContext } from 'react'
import type { WikiKind, WikiPage } from '../../types/wiki'

/** What the editor's links and previews need from the People & Places tab. */
export interface WikiContextValue {
  characterId: string
  pages: WikiPage[]
  /** Makes a new page (from a link to a name with no page yet); null if it failed. */
  createPage: (kind: WikiKind, name: string) => Promise<WikiPage | null>
}

export const WikiContext = createContext<WikiContextValue | null>(null)

export function useWiki(): WikiContextValue {
  const value = useContext(WikiContext)
  if (!value) throw new Error('useWiki needs a <WikiContext.Provider>')
  return value
}

/** A page's address: the People & Places tab with that page open. */
export function wikiPath(characterId: string, pageId?: string): string {
  return `/character/${characterId}/people${pageId ? `/${pageId}` : ''}`
}
