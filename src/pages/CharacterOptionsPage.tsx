import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { canEditCharacter } from '../lib/characterAccess'
import ConfirmButton from '../components/ConfirmButton'
import type { Character } from '../types/character'
import type { CharacterCampaign, CharacterKind, Visibility } from '../types/campaign'

const card = 'bg-stone-900 border border-stone-700 rounded-lg p-4'
const heading = 'text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3'
const input = 'bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500'

// A two-way switch styled like the rest of the app's toggles.
function Choice<T extends string>({ value, options, onChange, label }: {
  value: T
  options: [T, string][]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded border border-stone-600 overflow-hidden">
      {options.map(([v, text]) => (
        <button key={v} type="button" onClick={() => { if (v !== value) onChange(v) }} aria-pressed={v === value}
          className={`px-3 py-1 text-xs transition-colors ${v === value ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-amber-300'}`}>
          {text}
        </button>
      ))}
    </div>
  )
}

// One character's settings, for its owner: name, PC or NPC, which campaigns
// it's in and whether it's public or private in each, and deleting it.
export default function CharacterOptionsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const [character, setCharacter] = useState<Character | null>(null)
  const [campaigns, setCampaigns] = useState<CharacterCampaign[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const loadCampaigns = useCallback(() => {
    if (!id) return Promise.resolve()
    return api<CharacterCampaign[]>('GET', `characters/${id}/campaigns`).then(({ data }) => setCampaigns(data ?? []))
  }, [id])

  useEffect(() => {
    if (!id) return
    api<Character>('GET', `characters/${id}`).then(({ data }) => {
      if (!data) { navigate('/characters'); return }
      setCharacter(data)
      setName(data.name)
    })
  }, [id, navigate])
  useEffect(() => { void loadCampaigns() }, [loadCampaigns])

  // Only the owner (or an admin) manages a character; anyone else goes to the sheet.
  useEffect(() => {
    if (character && !canEditCharacter(character, user?.id, role)) navigate(`/character/${character.id}`, { replace: true })
  }, [character, user, role, navigate])

  if (!character) {
    return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><span className="text-amber-400 text-sm">Loading…</span></div>
  }

  async function saveSettings(changes: { name?: string; kind?: CharacterKind }) {
    if (!character) return
    const next = { name: changes.name ?? character.name, kind: changes.kind ?? character.kind }
    if (!next.name.trim()) { setError('Give the character a name.'); return }
    setError(null)
    const { error } = await api('PUT', `characters/${character.id}/settings`, { name: next.name.trim(), kind: next.kind })
    if (error) { setError(error); return }
    setCharacter({ ...character, ...next, name: next.name.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  async function campaignChange(method: 'PUT' | 'DELETE', campaignId: string, visibility?: Visibility) {
    setError(null)
    const { error } = await api(method, `characters/${id}/campaigns/${campaignId}`, visibility ? { visibility } : undefined)
    if (error) { setError(error); return }
    await loadCampaigns()
  }

  async function deleteCharacter() {
    const { error } = await api('DELETE', `characters/${id}`)
    if (error) { setError(error); return }
    navigate('/characters')
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-stone-700">
        <button onClick={() => navigate(`/character/${character.id}`)} className="text-stone-400 hover:text-stone-200 text-sm shrink-0">← Sheet</button>
        <h1 className="text-xl font-bold text-amber-400 truncate">{character.name}</h1>
        <span className="text-sm text-stone-500">Options</span>
        <span className="flex-1" />
        {saved && <span className="text-xs text-emerald-400">Saved</span>}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}

        <section className={card}>
          <h2 className={heading}>Character</h2>
          <div className="space-y-3">
            <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); void saveSettings({ name }) }}>
              <label htmlFor="character-name" className="text-sm text-stone-400 w-24 shrink-0">Name</label>
              <input id="character-name" value={name} onChange={e => setName(e.target.value)} className={`${input} flex-1`} />
              <button type="submit" disabled={name.trim() === character.name || !name.trim()}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded px-3 py-1 text-sm">Rename</button>
            </form>
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-400 w-24 shrink-0">Type</span>
              <Choice label="PC or NPC" value={character.kind} options={[['pc', 'PC'], ['npc', 'NPC']]} onChange={kind => void saveSettings({ kind })} />
            </div>
            <p className="text-xs text-stone-500">Changing the type doesn't change whether it's public or private in the campaigns it's already in.</p>
          </div>
        </section>

        <section className={card}>
          <h2 className={heading}>Campaigns</h2>
          {campaigns.length === 0 ? (
            <p className="text-sm text-stone-500">You're not in any campaign yet. Join or start one from Campaigns.</p>
          ) : (
            <div>
              {campaigns.map(c => (
                <div key={c.id} className="flex items-center gap-3 py-2 border-b border-stone-800 last:border-0">
                  <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                    <input type="checkbox" checked={c.joined} className="accent-amber-500"
                      onChange={() => void campaignChange(c.joined ? 'DELETE' : 'PUT', c.id)} />
                    <span className={`text-sm truncate ${c.joined ? 'text-stone-100' : 'text-stone-500'}`}>{c.name}</span>
                  </label>
                  {c.joined && c.visibility && (
                    <Choice label={`Visibility in ${c.name}`} value={c.visibility} options={[['public', 'Public'], ['private', 'Private']]}
                      onChange={v => void campaignChange('PUT', c.id, v)} />
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-stone-500 mt-3">
            Public: the other members of that campaign can open this sheet (view only). Private: only you and its Storyteller can.
            Every member sees a PC's name either way; a private NPC stays hidden from the players.
          </p>
        </section>

        <div className="flex justify-end">
          <ConfirmButton label="Delete character" confirmLabel="Delete it for good?"
            className="text-xs px-2 py-0.5 rounded border border-stone-600 text-stone-400 hover:text-red-400 hover:border-red-500 transition-colors"
            onConfirm={() => void deleteCharacter()} />
        </div>
      </div>
    </div>
  )
}
