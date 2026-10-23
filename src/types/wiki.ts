// People & Places: a character owner's private wiki (backend WikiController).

export type WikiKind = 'person' | 'place' | 'group'

/** The editor's document (Tiptap JSON), stored by the server as it is. */
export interface RichDoc {
  type?: string
  attrs?: Record<string, unknown>
  text?: string
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  content?: RichDoc[]
}

export interface WikiSection {
  id: string
  title: string | null
  body: RichDoc | null
}

export interface WikiPage {
  id: string
  kind: WikiKind
  name: string
  /** A person's current place, a place's surrounding place, a group's base. */
  place_id: string | null
  group_ids: string[]
  body: RichDoc | null
  sections: WikiSection[]
  /** The image's address, or null. */
  image: string | null
  updated_at: string | null
}
