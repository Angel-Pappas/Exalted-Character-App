import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { CircleCampaign } from '../types/campaign'

// Notes about one PC: saved a moment after typing stops, and when the box loses focus.
function NotesBox({ characterId, subjectId, initial }: { characterId: string; subjectId: string; initial: string }) {
  const [notes, setNotes] = useState(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastSaved = useRef(initial)

  async function save(text: string) {
    clearTimeout(timer.current)
    if (text === lastSaved.current) return
    setStatus('saving')
    const { error } = await api('PUT', `characters/${characterId}/circle/${subjectId}`, { notes: text })
    if (error) { setStatus('error'); return }
    lastSaved.current = text
    setStatus('saved')
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <div>
      <textarea value={notes} rows={4} placeholder="Your own notes about this character…"
        onChange={e => {
          const text = e.target.value
          setNotes(text)
          clearTimeout(timer.current)
          timer.current = setTimeout(() => void save(text), 800)
        }}
        onBlur={() => void save(notes)}
        className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500 resize-y" />
      <p className={`text-[10px] h-3 ${status === 'error' ? 'text-red-400' : 'text-stone-500'}`}>
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? "Couldn't save — try again" : ''}
      </p>
    </div>
  )
}

// The other players' PCs in each campaign this character is in, with notes
// only this character's owner can read.
export default function CircleTab({ characterId }: { characterId: string }) {
  const navigate = useNavigate()
  const [circle, setCircle] = useState<CircleCampaign[] | null>(null)

  useEffect(() => {
    api<CircleCampaign[]>('GET', `characters/${characterId}/circle`).then(({ data }) => setCircle(data ?? []))
  }, [characterId])

  if (circle === null) return <p className="p-6 text-sm text-stone-500">Loading…</p>

  if (circle.length === 0) {
    return (
      <p className="p-6 text-sm text-stone-500">
        This character isn't in a campaign yet. Add it to one from its Options, and the other players' characters will show up here.
      </p>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <p className="text-xs text-stone-500">Your notes here are private: only you can read them.</p>
      {circle.map(campaign => (
        <section key={campaign.id}>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">{campaign.name}</h2>
          {campaign.characters.length === 0 ? (
            <p className="text-sm text-stone-500">No other player characters in this campaign yet.</p>
          ) : (
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]">
              {campaign.characters.map(pc => (
                <div key={pc.id} className="bg-stone-900 border border-stone-700 rounded-lg p-3 space-y-2">
                  <div className="flex items-baseline gap-2">
                    {pc.can_view ? (
                      <button onClick={() => navigate(`/character/${pc.id}`)} className="text-sm font-semibold text-stone-100 hover:text-amber-400 transition-colors text-left">{pc.name}</button>
                    ) : (
                      <span className="text-sm font-semibold text-stone-300">{pc.name}</span>
                    )}
                    <span className="text-xs text-stone-500">{pc.owner}</span>
                    {!pc.can_view && <span className="ml-auto text-[10px] text-stone-600">Private sheet</span>}
                  </div>
                  <NotesBox characterId={characterId} subjectId={pc.id} initial={pc.notes} />
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
