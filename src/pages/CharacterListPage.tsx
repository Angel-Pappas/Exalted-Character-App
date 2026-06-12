import { useAuth } from '../contexts/AuthContext'

export default function CharacterListPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-4">
      <header className="flex items-center justify-between mb-8 border-b border-stone-700 pb-4">
        <h1 className="text-2xl font-bold text-amber-400">Exalted Characters</h1>
        <div className="flex items-center gap-4">
          <span className="text-stone-400 text-sm">{user?.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto">
        <p className="text-stone-400 text-center mt-16">
          Character sheet coming soon — tell me what fields you need!
        </p>
      </div>
    </div>
  )
}
