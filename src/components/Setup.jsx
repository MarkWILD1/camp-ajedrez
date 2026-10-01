import { useState } from 'react'
import { nextPowerOfTwo } from '../lib/bracket.js'

export default function Setup({ savedCount, onCreate, onContinue }) {
  const [count, setCount] = useState(savedCount || 8)
  const [error, setError] = useState('')
  const value = Number(count)
  const valid = Number.isInteger(value) && value >= 2 && value <= 32
  const size = valid ? nextPowerOfTwo(value) : null
  const byes = valid ? size - value : 0

  function handleSubmit(event) {
    event.preventDefault()
    if (!valid) {
      setError('Indica un número entero entre 2 y 32.')
      return
    }
    setError('')
    onCreate(value)
  }

  return (
    <main className="setup-screen">
      <form className="setup-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Eliminación directa</p>
        <h1>Torneo de ajedrez</h1>
        <p className="lede">
          Indica cuántos jugadores participan. El cuadro se arma en cruces de 1 contra 1 y cada ganador sube de fase.
        </p>
        <label className="field" htmlFor="player-count">
          Cantidad de jugadores
          <input
            id="player-count"
            type="number"
            min="2"
            max="32"
            inputMode="numeric"
            value={count}
            onChange={(event) => {
              setCount(event.target.value === '' ? '' : Number(event.target.value))
              setError('')
            }}
          />
        </label>
        {valid && (
          <p className="preview">
            Cuadro de {size}.{' '}
            {byes === 0
              ? 'Todos juegan la primera ronda.'
              : byes === 1
                ? 'Hay 1 pase directo.'
                : `Hay ${byes} pases directos.`}
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="setup-actions">
          <button className="btn btn-primary" type="submit">
            Armar tabla
          </button>
          {savedCount ? (
            <button className="btn btn-ghost" type="button" onClick={onContinue}>
              Continuar torneo
            </button>
          ) : null}
        </div>
      </form>
    </main>
  )
}
