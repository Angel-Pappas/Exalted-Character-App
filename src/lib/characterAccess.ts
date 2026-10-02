// Who may change a character: its owner, or an admin. Everyone else who can
// open it (a campaign's Storyteller, or a member where it's public) only views.
// The server enforces the same rule; this only decides what the page offers.
export function canEditCharacter(character: { user_id: string }, userId: string | undefined, role: string | null): boolean {
  return character.user_id === userId || role === 'admin'
}
