import { describe, it, expect } from 'vitest'
import { canEditCharacter } from './characterAccess'

describe('canEditCharacter', () => {
  const sheet = { user_id: 'owner' }

  it('lets the owner edit', () => expect(canEditCharacter(sheet, 'owner', 'player')).toBe(true))
  it('lets an admin edit any character', () => expect(canEditCharacter(sheet, 'someone', 'admin')).toBe(true))
  it('leaves everyone else viewing only — the Storyteller included', () => {
    expect(canEditCharacter(sheet, 'storyteller', 'player')).toBe(false)
    expect(canEditCharacter(sheet, undefined, null)).toBe(false)
  })
})
