import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { TooltipLayer } from '../components/Tooltip'
import ConfirmButton from '../components/ConfirmButton'
import type { Character } from '../types/character'
import { KIND_LABEL } from '../types/campaign'
import type { CampaignCharacter, CampaignDetail, Person } from '../types/campaign'

const card = 'bg-stone-900 border border-stone-700 rounded-lg p-4'
const heading = 'text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3'
const input = 'bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500'
const smallBtn = 'text-xs px-2 py-0.5 rounded border border-stone-600 text-stone-400 hover:text-amber-300 hover:border-amber-500 transition-colors'

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [myCharacters, setMyCharacters] = useState<Character[]>([])
  const [error, setError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const [newMember, setNewMember] = useState('')
  const [addCharacterId, setAddCharacterId] = useState('')

  // Loads the campaign; someone who isn't (or is no longer) a member is sent back.
  const load = useCallback(() => {
    if (!id) return Promise.resolve()
    return api<CampaignDetail>('GET', `campaigns/${id}`).then(({ data, status }) => {
      if (data) setCampaign(data)
      else navigate(status === 403 || status === 404 ? '/campaigns' : '/')
    })
  }, [id, navigate])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    api<Character[]>('GET', 'characters').then(({ data }) => setMyCharacters(data ?? []))
  }, [])

  // Runs a change, then reloads the campaign; shows the server's message if it refuses.
  async function act(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, after?: () => void) {
    setError(null)
    const { error } = await api(method, path, body)
    if (error) { setError(error); return }
    if (after) after()
    else await load()
  }

  if (!campaign) {
    return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><span className="text-amber-400 text-sm">Loading…</span></div>
  }

  const st = campaign.is_storyteller
  const c = campaign.id
  const pcs = campaign.characters.filter(ch => ch.kind === 'pc')
  const npcs = campaign.characters.filter(ch => ch.kind === 'npc')
  const inCampaign = new Set(campaign.characters.map(ch => ch.id))
  const addable = myCharacters.filter(ch => !inCampaign.has(ch.id))

  function characterRow(ch: CampaignCharacter) {
    const showVisibility = ch.mine || st
    return (
      <div key={ch.id} className="flex items-center gap-2 py-1.5 border-b border-stone-800 last:border-0">
        {ch.can_view ? (
          <button onClick={() => navigate(`/character/${ch.id}`)} className="text-sm text-stone-100 hover:text-amber-400 transition-colors text-left truncate">{ch.name}</button>
        ) : (
          <span className="text-sm text-stone-400 truncate" data-tip="Its owner keeps this sheet private">{ch.name}</span>
        )}
        <span className="text-xs text-stone-500 truncate">{ch.mine ? 'yours' : ch.owner.username}</span>
        <span className="flex-1" />
        {showVisibility && (
          <span className={`text-[11px] px-1.5 rounded border ${ch.visibility === 'public' ? 'border-emerald-700/60 text-emerald-400' : 'border-stone-600 text-stone-400'}`}>
            {ch.visibility === 'public' ? 'Public' : 'Private'}
          </span>
        )}
        {!ch.can_view && !showVisibility && <span className="text-[11px] text-stone-600">Private</span>}
        {(ch.mine || st) && (
          <ConfirmButton label="✕" confirmLabel="Take out?" className="text-xs text-stone-600 hover:text-red-400 transition-colors border border-transparent rounded px-1"
            onConfirm={() => void act('DELETE', `characters/${ch.id}/campaigns/${c}`)} />
        )}
      </div>
    )
  }

  function memberRow(m: Person) {
    const isSt = m.id === campaign?.storyteller.id
    const isMe = m.id === user?.id
    return (
      <div key={m.id} className="flex items-center gap-2 py-1.5 border-b border-stone-800 last:border-0">
        <span className="text-sm text-stone-100">{m.username}</span>
        {isMe && <span className="text-xs text-stone-500">(you)</span>}
        {isSt && <span className="text-[11px] px-1.5 rounded border border-amber-600/60 text-amber-400">Storyteller</span>}
        <span className="flex-1" />
        {st && !isSt && (
          <>
            <ConfirmButton label="Make Storyteller" confirmLabel={`Hand ST to ${m.username}?`} className={smallBtn}
              onConfirm={() => void act('PUT', `campaigns/${c}/storyteller`, { user_id: m.id })} />
            <ConfirmButton label="Remove" confirmLabel="Remove?" className={smallBtn}
              onConfirm={() => void act('DELETE', `campaigns/${c}/members/${m.id}`)} />
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-stone-700">
        <button onClick={() => navigate('/campaigns')} className="text-stone-400 hover:text-stone-200 text-sm shrink-0">← Campaigns</button>
        {renaming ? (
          <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); if (name.trim()) void act('PUT', `campaigns/${c}`, { name: name.trim() }, () => { setRenaming(false); void load() }) }}>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setRenaming(false) }} className={input} aria-label="Campaign name" />
            <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-1 text-xs">Save</button>
            <button type="button" onClick={() => setRenaming(false)} className="text-stone-500 hover:text-stone-300 text-xs">Cancel</button>
          </form>
        ) : (
          <h1 className="text-xl font-bold text-amber-400 truncate">{campaign.name}</h1>
        )}
        {st && !renaming && (
          <button onClick={() => { setName(campaign.name); setRenaming(true) }} data-tip="Rename" aria-label="Rename campaign" className="text-stone-500 hover:text-amber-400 text-sm">✎</button>
        )}
        <span className="flex-1" />
        <span className="text-xs text-stone-500">Storyteller: <span className="text-stone-300">{campaign.storyteller.username}</span></span>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          <section className={card}>
            <h2 className={heading}>PCs</h2>
            {pcs.length === 0 ? <p className="text-sm text-stone-500">No player characters yet.</p> : pcs.map(characterRow)}
          </section>
          <section className={card}>
            <h2 className={heading}>NPCs</h2>
            {npcs.length === 0
              ? <p className="text-sm text-stone-500">{st ? 'No NPCs yet.' : 'No NPCs you can see.'}</p>
              : npcs.map(characterRow)}
          </section>
        </div>

        <section className={card}>
          <h2 className={heading}>Add one of your characters</h2>
          {addable.length === 0 ? (
            <p className="text-sm text-stone-500">All your characters are already in this campaign.</p>
          ) : (
            <div className="flex items-center gap-2">
              <select value={addCharacterId} onChange={e => setAddCharacterId(e.target.value)} className={`${input} flex-1`} aria-label="Character to add">
                <option value="">— Choose a character —</option>
                {addable.map(ch => <option key={ch.id} value={ch.id}>{ch.name} ({KIND_LABEL[ch.kind]})</option>)}
              </select>
              <button disabled={!addCharacterId}
                onClick={() => void act('PUT', `characters/${addCharacterId}/campaigns/${c}`, undefined, () => { setAddCharacterId(''); void load() })}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded px-3 py-1 text-sm">Add</button>
            </div>
          )}
          <p className="text-xs text-stone-500 mt-2">PCs join as public and NPCs as private. Change that in the character's options.</p>
        </section>

        <section className={card}>
          <h2 className={heading}>Members</h2>
          {campaign.members.map(memberRow)}
          {st && (
            <form className="flex items-center gap-2 mt-3" onSubmit={e => { e.preventDefault(); if (newMember.trim()) void act('POST', `campaigns/${c}/members`, { username: newMember.trim() }, () => { setNewMember(''); void load() }) }}>
              <input value={newMember} onChange={e => setNewMember(e.target.value)} placeholder="Username" className={`${input} flex-1`} aria-label="Username to add" />
              <button type="submit" disabled={!newMember.trim()} className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded px-3 py-1 text-sm">Add member</button>
            </form>
          )}
        </section>

        <div className="flex justify-end">
          {st ? (
            <ConfirmButton label="Delete campaign" confirmLabel="Delete it? Characters are kept" className={smallBtn}
              onConfirm={() => void act('DELETE', `campaigns/${c}`, undefined, () => navigate('/campaigns'))} />
          ) : user && (
            <ConfirmButton label="Leave campaign" confirmLabel="Leave? Your characters come out too" className={smallBtn}
              onConfirm={() => void act('DELETE', `campaigns/${c}/members/${user.id}`, undefined, () => navigate('/campaigns'))} />
          )}
        </div>
      </div>
      <TooltipLayer />
    </div>
  )
}
