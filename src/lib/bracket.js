const ROUND_TITLES = ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinal']

export function nextPowerOfTwo(count) {
  let size = 1
  while (size < count) size *= 2
  return size
}

function roundDepth(size) {
  let depth = 0
  while (2 ** depth < size) depth += 1
  return depth
}

export function roundTitles(totalRounds) {
  const prelim = totalRounds - 1
  if (prelim <= 0) return []
  return ROUND_TITLES.slice(ROUND_TITLES.length - prelim)
}

function emptySlot(seed) {
  return { name: '', isBye: false, locked: false, seed }
}

function byeSlot() {
  return { name: '', isBye: true, locked: true, seed: null }
}

function advancedSlot() {
  return { name: '', isBye: false, locked: true, seed: null }
}

export function createBracket(count) {
  const size = nextPowerOfTwo(count)
  const rounds = roundDepth(size)
  const byes = size - count
  const fullMatches = (count - byes) / 2
  const roundsMatches = []

  for (let round = 0; round < rounds; round += 1) {
    const countInRound = size / 2 ** (round + 1)
    const roundMatches = []
    for (let index = 0; index < countInRound; index += 1) {
      const isFinal = round === rounds - 1
      roundMatches.push({
        id: isFinal ? 'final' : `r${round}-m${index}`,
        round,
        side: isFinal ? 'final' : index < countInRound / 2 ? 'left' : 'right',
        index,
        slotA: round === 0 ? emptySlot(0) : advancedSlot(),
        slotB: round === 0 ? emptySlot(0) : advancedSlot(),
        winner: null,
        nextMatchId: null,
        nextSlot: null,
        sentSide: null,
        sentName: '',
      })
    }
    roundsMatches.push(roundMatches)
  }

  for (let round = 0; round < rounds - 1; round += 1) {
    roundsMatches[round].forEach((match, index) => {
      const next = roundsMatches[round + 1][Math.floor(index / 2)]
      match.nextMatchId = next.id
      match.nextSlot = index % 2 === 0 ? 'A' : 'B'
    })
  }

  let seed = 1
  roundsMatches[0].forEach((match, index) => {
    if (index < fullMatches) {
      match.slotA = emptySlot(seed)
      seed += 1
      match.slotB = emptySlot(seed)
      seed += 1
      return
    }
    match.slotA = emptySlot(seed)
    seed += 1
    match.slotB = byeSlot()
  })

  return {
    playerCount: count,
    size,
    rounds,
    matches: roundsMatches.flat(),
  }
}

function cloneMatches(matches) {
  return matches.map((match) => ({
    ...match,
    slotA: { ...match.slotA },
    slotB: { ...match.slotB },
  }))
}

function winnerName(match) {
  if (match.winner === 'A') return match.slotA.name.trim()
  if (match.winner === 'B') return match.slotB.name.trim()
  return ''
}

function resolveWinner(match) {
  const nameA = match.slotA.name.trim()
  const nameB = match.slotB.name.trim()
  if (match.slotB.isBye) return nameA ? 'A' : null
  if (match.slotA.isBye) return nameB ? 'B' : null
  if (match.winner === 'A' && nameA) return 'A'
  if (match.winner === 'B' && nameB) return 'B'
  return null
}

export function propagate(matches) {
  const list = cloneMatches(matches)
  const byId = new Map(list.map((match) => [match.id, match]))
  const ordered = [...list].sort((a, b) => a.round - b.round || a.index - b.index)

  for (const item of ordered) {
    const match = byId.get(item.id)
    const prevSentSide = match.sentSide ?? null
    const prevSentName = match.sentName ?? ''
    match.winner = resolveWinner(match)
    const name = winnerName(match)
    const sideChanged = prevSentSide !== match.winner
    const nameCleared = prevSentName.trim() !== '' && name === ''
    match.sentSide = match.winner
    match.sentName = name

    if (!match.nextMatchId) continue

    const next = byId.get(match.nextMatchId)
    const key = match.nextSlot === 'A' ? 'slotA' : 'slotB'
    next[key] = { name, isBye: false, locked: true, seed: null }
    if (sideChanged || nameCleared) {
      next.winner = null
    }
  }

  return list
}

export function setPlayerName(state, matchId, which, name) {
  const matches = state.matches.map((match) => {
    if (match.id !== matchId || match.round !== 0) return match
    const key = which === 'A' ? 'slotA' : 'slotB'
    if (match[key].isBye) return match
    return { ...match, [key]: { ...match[key], name } }
  })
  return { ...state, matches: propagate(matches) }
}

export function setWinner(state, matchId, which) {
  const matches = state.matches.map((match) => {
    if (match.id !== matchId) return match
    if (match.slotA.isBye || match.slotB.isBye) return match
    const slot = which === 'A' ? match.slotA : match.slotB
    const other = which === 'A' ? match.slotB : match.slotA
    if (!slot.name.trim() || !other.name.trim()) return match
    const winner = match.winner === which ? null : which
    return { ...match, winner }
  })
  return { ...state, matches: propagate(matches) }
}

export function getChampion(state) {
  const finalMatch = state.matches.find((match) => match.side === 'final')
  if (!finalMatch?.winner) return ''
  const slot = finalMatch.winner === 'A' ? finalMatch.slotA : finalMatch.slotB
  return slot.name.trim()
}
