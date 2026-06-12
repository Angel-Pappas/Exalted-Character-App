interface Props {
  notes: string
  onChange: (notes: string) => void
}

export default function NotesTab({ notes, onChange }: Props) {
  return (
    <div className="p-4 h-full">
      <textarea
        value={notes}
        onChange={e => onChange(e.target.value)}
        placeholder="Write anything here…"
        className="w-full h-[calc(100vh-12rem)] bg-stone-900 border border-stone-700 text-stone-100 rounded-lg p-4 text-sm resize-none focus:outline-none focus:border-amber-500 placeholder-stone-600"
      />
    </div>
  )
}
