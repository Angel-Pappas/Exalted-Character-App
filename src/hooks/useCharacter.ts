import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { normalizeLedger } from '../lib/milestones'
import type { Character, CharacterData, GameData } from '../types/character'
import { DEFAULT_GAME_DATA } from '../types/character'

const defaultData: CharacterData = {
  sheet: { attributes: {}, abilities: {}, defenses: {}, defenseOther: false, fullDefense: false, essence: 1, anima: 0, power: 0, will: 0, defenseBonus: { parry: 0, evasion: 0, soak: 0, hardness: 0, resolve: 0 }, languages: [], merits: [], intimacies: [], motes: { current: 0, committed: 0, total: 0 }, damage: 0, layout: [], charms: [], charmGroups: [], effects: [], inventory: [], foi: { active: false, weight: null, tag: null, artifact: false }, foiOriginals: {}, exaltType: '', caste: '' },
  milestones: [],
  notes: '',
  npcs: [],
}

// Loads one character for a page (back to the hub if it can't be opened), plus
// its data with defaults filled in. Saving is the page's business.
export function useCharacter(id: string | undefined) {
  const navigate = useNavigate()
  const [character, setCharacter] = useState<Character | null>(null)
  const [data, setData] = useState<CharacterData>(defaultData)

  useEffect(() => {
    if (!id) return
    api<Character>('GET', `characters/${id}`)
      .then(({ data: char, error }) => {
        if (error || !char) { navigate('/'); return }
        setCharacter(char)
        const loaded = { ...defaultData, ...char.data }
        setData({ ...loaded, milestones: normalizeLedger(loaded.milestones) })
      })
  }, [id, navigate])

  return { character, data, setData }
}

// The signed-in user's reference tables (weapons, armor, tags…), each falling
// back to the defaults when the user has none saved.
export function useGameData(): GameData {
  const { user } = useAuth()
  const [gameData, setGameData] = useState<GameData>(DEFAULT_GAME_DATA)

  useEffect(() => {
    if (!user) return
    api<{ data: Partial<GameData> | null }>('GET', 'game-data')
      .then(({ data: row }) => {
        if (row?.data) {
          setGameData({
            weapons:      row.data.weapons      ?? DEFAULT_GAME_DATA.weapons,
            armor:        row.data.armor        ?? DEFAULT_GAME_DATA.armor,
            tagGroups:    row.data.tagGroups    ?? DEFAULT_GAME_DATA.tagGroups,
            essenceMotes: row.data.essenceMotes ?? DEFAULT_GAME_DATA.essenceMotes,
            animaStates:  row.data.animaStates  ?? DEFAULT_GAME_DATA.animaStates,
          })
        }
      })
  }, [user])

  return gameData
}
