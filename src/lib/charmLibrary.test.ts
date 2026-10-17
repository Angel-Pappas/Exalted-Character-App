import { describe, it, expect, vi, beforeEach } from 'vitest'

const api = vi.fn()
vi.mock('./api', () => ({ api: (...args: unknown[]) => api(...args) }))

const row = (id: string, summary: string) => ({ id, name: id, description: 'Text.', summary })

describe('the charm library cache', () => {
  beforeEach(() => { vi.resetModules(); api.mockReset() })

  it('is empty until the first load, then serves the last load at once', async () => {
    const { cachedCharmLibrary, loadCharmLibrary } = await import('./charmLibrary')
    expect(cachedCharmLibrary()).toBeNull()
    api.mockResolvedValueOnce({ data: [row('ox', 'One')], error: null })
    expect((await loadCharmLibrary()).map(c => c.summary)).toEqual(['One'])
    expect(cachedCharmLibrary()?.map(c => c.id)).toEqual(['ox'])
  })

  it('loads afresh each time, so an admin edit shows', async () => {
    const { cachedCharmLibrary, loadCharmLibrary } = await import('./charmLibrary')
    api.mockResolvedValueOnce({ data: [row('ox', 'One')], error: null })
    await loadCharmLibrary()
    api.mockResolvedValueOnce({ data: [row('ox', 'Two')], error: null })
    await loadCharmLibrary()
    expect(cachedCharmLibrary()?.[0].summary).toBe('Two')
  })

  it("maps a mode's commit dots, leaving them out where there are none", async () => {
    const { loadCharmLibrary } = await import('./charmLibrary')
    const mode = (label: string, commit_motes: number) => ({ label, mode_text: '', prerequisite_essence: null, commit_motes, charm_mode_prerequisite_abilities: [] })
    api.mockResolvedValueOnce({ data: [{ ...row('crow', 'One'), charm_modes: [mode('Liminal', 1), mode('Solar', 0)] }], error: null })
    const [crow] = await loadCharmLibrary()
    expect(crow.modes.map(m => m.commitMotes)).toEqual([1, undefined])
  })

  it('keeps the last good copy when a load fails', async () => {
    const { cachedCharmLibrary, loadCharmLibrary } = await import('./charmLibrary')
    api.mockResolvedValueOnce({ data: [row('ox', 'One')], error: null })
    await loadCharmLibrary()
    api.mockResolvedValueOnce({ data: null, error: 'offline' })
    expect(await loadCharmLibrary()).toHaveLength(1)
    expect(cachedCharmLibrary()).toHaveLength(1)
  })
})
