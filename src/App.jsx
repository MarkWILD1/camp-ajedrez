import { useEffect, useState } from 'react'
import { createBracket, setPlayerName, setWinner } from './lib/bracket.js'
import { readTournament, saveTournament } from './lib/storage.js'
import Setup from './components/Setup.jsx'
import Bracket from './components/Bracket.jsx'

export default function App() {
  const [tournament, setTournament] = useState(() => readTournament())
  const [view, setView] = useState(() => (readTournament() ? 'bracket' : 'setup'))

  useEffect(() => {
    if (tournament) saveTournament(tournament)
  }, [tournament])

  return (
    <div className="app">
      <div className="rays rays-left" aria-hidden="true" />
      <div className="rays rays-right" aria-hidden="true" />
      {view === 'bracket' && tournament ? (
        <>
          <header className="topbar">
            <div>
              <p className="eyebrow">Eliminación directa</p>
              <h1>Torneo de ajedrez</h1>
            </div>
            <button className="btn btn-ghost" type="button" onClick={() => setView('setup')}>
              Nuevo torneo
            </button>
          </header>
          <Bracket
            tournament={tournament}
            onName={(matchId, which, name) => {
              setTournament((current) => setPlayerName(current, matchId, which, name))
            }}
            onWinner={(matchId, which) => {
              setTournament((current) => setWinner(current, matchId, which))
            }}
          />
        </>
      ) : (
        <Setup
          savedCount={tournament?.playerCount ?? 0}
          onCreate={(count) => {
            setTournament(createBracket(count))
            setView('bracket')
          }}
          onContinue={() => setView('bracket')}
        />
      )}
    </div>
  )
}
