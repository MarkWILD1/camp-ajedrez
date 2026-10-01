function slotOf(match, which) {
  return which === 'A' ? match.slotA : match.slotB
}

function otherOf(match, which) {
  return which === 'A' ? match.slotB : match.slotA
}

export function PlayerSlot({ match, which, onName, onWinner, tag = '' }) {
  const slot = slotOf(match, which)
  const other = otherOf(match, which)
  const isWinner = match.winner === which
  const pickable =
    !slot.isBye &&
    !other.isBye &&
    Boolean(slot.name.trim()) &&
    Boolean(other.name.trim())
  const tagMark = tag ? <span className="tag">{tag}</span> : null

  if (slot.isBye) {
    return <div className="slot is-bye">Pasa directo</div>
  }

  const pickedMark = (
    <span className={`pick ${isWinner ? 'is-on' : ''}`} aria-hidden="true" />
  )

  if (match.round === 0 && !slot.locked) {
    return (
      <div className={`slot ${isWinner ? 'is-winner' : ''}`}>
        {tagMark}
        <input
          value={slot.name}
          placeholder={`Jugador ${slot.seed}`}
          aria-label={tag ? `${tag}, jugador ${slot.seed}` : `Jugador ${slot.seed}`}
          maxLength={40}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onName(match.id, which, event.target.value)}
        />
        {pickable ? (
          <button
            type="button"
            className={`pick ${isWinner ? 'is-on' : ''}`}
            aria-pressed={isWinner}
            aria-label={`Marcar a ${slot.name.trim()} como ganador`}
            onClick={() => onWinner(match.id, which)}
          />
        ) : (
          isWinner && pickedMark
        )}
      </div>
    )
  }

  if (!slot.name.trim()) {
    return (
      <div className="slot is-empty">
        {tagMark}
        <span className="slot-name">Por definir</span>
      </div>
    )
  }

  if (pickable) {
    return (
      <button
        type="button"
        className={`slot ${isWinner ? 'is-winner' : ''}`}
        aria-pressed={isWinner}
        onClick={() => onWinner(match.id, which)}
      >
        {tagMark}
        <span className="slot-name">{slot.name.trim()}</span>
        {pickedMark}
      </button>
    )
  }

  return (
    <div className={`slot ${isWinner ? 'is-winner' : ''}`}>
      {tagMark}
      <span className="slot-name">{slot.name.trim()}</span>
      {isWinner && pickedMark}
    </div>
  )
}

export default function MatchCard({ match, onName, onWinner, featured = false, single = null }) {
  return (
    <article
      className={`match ${match.winner ? 'match-decided' : ''} ${featured ? 'match-featured' : ''} ${single ? 'match-single' : ''}`}
    >
      {single ? (
        <PlayerSlot match={match} which={single} onName={onName} onWinner={onWinner} />
      ) : (
        <>
          <PlayerSlot match={match} which="A" onName={onName} onWinner={onWinner} tag={featured ? 'S1' : ''} />
          <PlayerSlot match={match} which="B" onName={onName} onWinner={onWinner} tag={featured ? 'S2' : ''} />
        </>
      )}
    </article>
  )
}
