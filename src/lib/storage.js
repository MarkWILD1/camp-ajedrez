const STORAGE_HINT = 'camp-ajedrez-tournament'

export function readTournament() {
  try {
    const raw = localStorage.getItem(STORAGE_HINT)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.matches) || data.matches.length === 0) return null
    if (!Number.isInteger(data.playerCount)) return null
    return data
  } catch {
    return null
  }
}

export function saveTournament(tournament) {
  localStorage.setItem(STORAGE_HINT, JSON.stringify(tournament))
}
