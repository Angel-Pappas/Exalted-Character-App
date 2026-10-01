import { describe, expect, it } from 'vitest'
import { errorMessage, readXsrfToken } from './api'

describe('readXsrfToken', () => {
  it('finds the token among other cookies and URL-decodes it', () => {
    expect(readXsrfToken('theme=dark; XSRF-TOKEN=abc%3D%3D; other=1')).toBe('abc==')
    expect(readXsrfToken('XSRF-TOKEN=first')).toBe('first')
  })

  it('does not match a cookie whose name only ends in XSRF-TOKEN', () => {
    expect(readXsrfToken('NOT-XSRF-TOKEN=nope')).toBeNull()
    expect(readXsrfToken('')).toBeNull()
  })
})

describe('errorMessage', () => {
  it('prefers the first validation error', () => {
    expect(errorMessage(422, {
      message: 'The username has already been taken. (and 1 more error)',
      errors: { username: ['The username has already been taken.'], password: ['Too short.'] },
    })).toBe('The username has already been taken.')
  })

  it('falls back to the message, then to the status', () => {
    expect(errorMessage(403, { message: 'This action is unauthorized.' })).toBe('This action is unauthorized.')
    expect(errorMessage(500, null)).toBe('Request failed (500).')
    expect(errorMessage(502, '<html>')).toBe('Request failed (502).')
  })
})
