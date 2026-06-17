import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function HubCard({
  onClick,
  icon,
  label,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-500 rounded-2xl p-8 transition-all group"
    >
      <div className="text-stone-400 group-hover:text-amber-400 transition-colors">
        {icon}
      </div>
      <span className="text-sm font-medium text-stone-300 group-hover:text-stone-100 transition-colors tracking-wide">
        {label}
      </span>
    </button>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { signOut, role } = useAuth()

  const isAdmin = role === 'admin'

  const cards = [
    {
      label: 'Characters',
      onClick: () => navigate('/characters'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5.477-3.75M9 20H4v-2a4 4 0 015.477-3.75M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0zm-18 0a3 3 0 116 0 3 3 0 01-6 0z" />
        </svg>
      ),
    },
    {
      label: 'Settings',
      onClick: () => navigate('/options'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    ...(isAdmin ? [{
      label: 'Admin',
      onClick: () => navigate('/setup'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    }] : []),
    {
      label: 'Account',
      onClick: () => navigate('/options', { state: { section: 'Account' } }),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-stone-700">
        <h1 className="text-2xl font-bold text-amber-400">Exalted</h1>
        <button onClick={signOut} className="text-sm text-stone-400 hover:text-stone-200 transition-colors">
          Sign out
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className={`grid gap-4 w-full max-w-sm ${cards.length === 4 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {cards.map(card => (
            <HubCard key={card.label} {...card} />
          ))}
        </div>
      </div>
    </div>
  )
}
