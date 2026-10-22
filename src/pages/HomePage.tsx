import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import PageHeader from '../components/PageHeader'
import { KIND_LABEL } from '../types/campaign'
import type { CampaignSummary } from '../types/campaign'
import type { Character } from '../types/character'

const card = 'block bg-stone-900 border border-stone-700 hover:border-amber-500/70 rounded-lg px-4 py-3 transition-colors group'
const heading = 'text-xs font-semibold text-stone-400 uppercase tracking-widest'
const headerLink = 'text-sm text-stone-400 hover:text-stone-100 transition-colors'

// Where a signed-in player lands: their characters and campaigns, each one click
// away (it used to be four tiles, so every visit took an extra click to reach a
// sheet). Making and deleting characters and campaigns stays on their own pages.
export default function HomePage() {
  const { user, signOut, role } = useAuth()
  const [characters, setCharacters] = useState<Character[] | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null)

  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    api<Character[]>('GET', 'characters').then(({ data }) => setCharacters(data ?? []))
    api<CampaignSummary[]>('GET', 'campaigns').then(({ data }) => setCampaigns(data ?? []))
  }, [userId])

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <PageHeader title="Exalted">
        <nav className="flex items-center gap-4 ml-auto py-2.5" aria-label="Account">
          <Link to="/options" className={headerLink}>Settings</Link>
          {role === 'admin' && <Link to="/setup" className={headerLink}>Admin</Link>}
          <button onClick={signOut} className={headerLink}>Sign out</button>
        </nav>
      </PageHeader>

      <main className="w-full max-w-4xl mx-auto px-4 py-8 grid gap-8 md:grid-cols-2 items-start">
        <section aria-labelledby="home-characters">
          <div className="flex items-baseline justify-between mb-3">
            <h2 id="home-characters" className={heading}>Your characters</h2>
            <Link to="/characters" className="text-xs text-amber-400 hover:text-amber-300">New or manage →</Link>
          </div>
          {characters === null ? (
            <p className="text-sm text-stone-500">Loading…</p>
          ) : characters.length === 0 ? (
            <p className="text-sm text-stone-500">No characters yet. <Link to="/characters" className="text-amber-400 hover:text-amber-300">Create one</Link>.</p>
          ) : (
            <div className="space-y-2">
              {characters.map(c => {
                const identity = [c.data?.sheet?.exaltType, c.data?.sheet?.caste].filter(Boolean).join(' · ')
                return (
                  <Link key={c.id} to={`/character/${c.id}`} className={card}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-100 group-hover:text-amber-400 transition-colors truncate">{c.name}</span>
                      <span className={`text-[10px] px-1.5 rounded border shrink-0 ${c.kind === 'npc' ? 'border-sky-700/60 text-sky-400' : 'border-amber-700/60 text-amber-400'}`}>{KIND_LABEL[c.kind ?? 'pc']}</span>
                    </div>
                    {identity && <div className="text-xs text-stone-500 mt-0.5">{identity}</div>}
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="home-campaigns">
          <div className="flex items-baseline justify-between mb-3">
            <h2 id="home-campaigns" className={heading}>Your campaigns</h2>
            <Link to="/campaigns" className="text-xs text-amber-400 hover:text-amber-300">New or manage →</Link>
          </div>
          {campaigns === null ? (
            <p className="text-sm text-stone-500">Loading…</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-stone-500">Not in a campaign yet. <Link to="/campaigns" className="text-amber-400 hover:text-amber-300">Start one</Link>, or ask a Storyteller to add you.</p>
          ) : (
            <div className="space-y-2">
              {campaigns.map(c => (
                <Link key={c.id} to={`/campaign/${c.id}`} className={card}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-100 group-hover:text-amber-400 transition-colors truncate">{c.name}</span>
                    {c.is_storyteller && <span className="text-[10px] px-1.5 rounded border border-amber-700/60 text-amber-400 shrink-0">ST</span>}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    Storyteller: {c.storyteller.username} · {c.member_count} {c.member_count === 1 ? 'member' : 'members'}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
