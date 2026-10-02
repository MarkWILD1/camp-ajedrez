import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getChampion, roundTitles } from '../lib/bracket.js'
import MatchCard from './MatchCard.jsx'

const CARD_W = 200
const CARD_H = 72
const COL_GAP = 56
const ROW_PITCH = 104
const MIN_BOARD_H = 340
const PAD = 16
const MIN_ZOOM = 0.35
const MAX_ZOOM = 2
const ZOOM_STEP = 1.15

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function stagePad(stage) {
  const styles = getComputedStyle(stage)
  return {
    left: parseFloat(styles.paddingLeft) || 0,
    top: parseFloat(styles.paddingTop) || 0,
    x: (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0),
  }
}

function leafMatches(matches) {
  if (matches.length === 0) return []
  const minRound = Math.min(...matches.map((match) => match.round))
  return matches
    .filter((match) => match.round === minRound)
    .sort((a, b) => a.index - b.index)
}

function layoutCenters(matches, offset) {
  const center = new Map()
  const leaves = leafMatches(matches)
  leaves.forEach((match, index) => {
    center.set(match.id, offset + index * ROW_PITCH + ROW_PITCH / 2)
  })
  if (leaves.length === 0) return center

  const maxRound = Math.max(...matches.map((match) => match.round))
  for (let round = leaves[0].round + 1; round <= maxRound; round += 1) {
    matches
      .filter((match) => match.round === round)
      .forEach((match) => {
        const feeders = matches
          .filter((item) => item.nextMatchId === match.id)
          .map((item) => center.get(item.id))
        center.set(
          match.id,
          feeders.reduce((sum, value) => sum + value, 0) / feeders.length,
        )
      })
  }
  return center
}

function buildLayout(tournament) {
  const prelim = tournament.rounds - 1
  const labels = roundTitles(tournament.rounds)
  const left = tournament.matches.filter((match) => match.side === 'left')
  const right = tournament.matches.filter((match) => match.side === 'right')
  const leaves = Math.max(leafMatches(left).length, leafMatches(right).length, 1)
  const contentHeight = leaves * ROW_PITCH
  const boardHeight = Math.max(contentHeight, MIN_BOARD_H)
  const offset = (boardHeight - contentHeight) / 2
  const leftCenter = layoutCenters(left, offset)
  const rightCenter = layoutCenters(right, offset)
  const step = CARD_W + COL_GAP
  const finalX = PAD + prelim * step
  const finalTop = boardHeight / 2 - CARD_H / 2

  const xLeft = (round) => PAD + round * step
  const xRight = (round) => finalX + CARD_W + COL_GAP + (prelim - 1 - round) * step

  const cards = [
    ...left.map((match) => ({
      match,
      x: xLeft(match.round),
      y: leftCenter.get(match.id) - CARD_H / 2,
    })),
    ...right.map((match) => ({
      match,
      x: xRight(match.round),
      y: rightCenter.get(match.id) - CARD_H / 2,
    })),
  ]

  const columnLabels = [
    ...labels.map((text, round) => ({ text, x: xLeft(round) })),
    ...labels.map((text, round) => ({ text, x: xRight(round) })),
  ]

  const byId = new Map(tournament.matches.map((match) => [match.id, match]))
  const paths = tournament.matches
    .filter((match) => match.nextMatchId)
    .map((match) => {
      const next = byId.get(match.nextMatchId)
      const goingRight = match.side === 'left'
      const y1 = (goingRight ? leftCenter : rightCenter).get(match.id)
      const x1 = goingRight ? xLeft(match.round) + CARD_W : xRight(match.round)
      let x2
      let y2
      if (next.side === 'final') {
        x2 = goingRight ? finalX : finalX + CARD_W
        y2 = boardHeight / 2
      } else {
        x2 = goingRight ? xLeft(next.round) : xRight(next.round) + CARD_W
        y2 = (next.side === 'left' ? leftCenter : rightCenter).get(next.id)
      }
      const midX = goingRight ? x1 + COL_GAP / 2 : x1 - COL_GAP / 2
      return { id: match.id, d: `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}` }
    })

  const totalWidth = xRight(0) + CARD_W + PAD

  return {
    boardHeight,
    totalWidth,
    cards,
    columnLabels,
    paths,
    finalX,
    finalTop,
    finalMatch: tournament.matches.find((match) => match.side === 'final'),
  }
}

function FinalMark({ champion }) {
  return (
    <div className="final-mark">
      <span className="king" aria-hidden="true">
        ♔
      </span>
      <h2>FINAL</h2>
      {champion ? (
        <p className="champion">
          Campeón
          <strong>{champion}</strong>
        </p>
      ) : (
        <p className="champion-wait">El ganador de la final queda aquí</p>
      )}
    </div>
  )
}

export default function Bracket({ tournament, onName, onWinner }) {
  const champion = getChampion(tournament)
  const byes = tournament.size - tournament.playerCount
  const isDuo = tournament.size === 2
  const layout = isDuo ? null : buildLayout(tournament)
  const stageRef = useRef(null)
  const sheetRef = useRef(null)
  const wheelAnchor = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [fitWidth, setFitWidth] = useState(true)
  const [sheetHeight, setSheetHeight] = useState(() => (layout ? layout.boardHeight + 32 : 0))

  useLayoutEffect(() => {
    if (isDuo) return undefined
    const sheet = sheetRef.current
    if (!sheet) return undefined
    const measure = () => setSheetHeight(sheet.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(sheet)
    return () => observer.disconnect()
  }, [isDuo, layout?.boardHeight, layout?.totalWidth])

  useLayoutEffect(() => {
    if (isDuo || !fitWidth) return undefined
    const stage = stageRef.current
    if (!stage || !layout) return undefined
    const apply = () => {
      const available = stage.clientWidth - stagePad(stage).x
      setZoom(clampZoom(Math.min(1, available / layout.totalWidth)))
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [isDuo, fitWidth, layout?.totalWidth])

  useLayoutEffect(() => {
    const anchor = wheelAnchor.current
    const stage = stageRef.current
    if (!anchor || !stage) return
    stage.scrollLeft = anchor.scrollLeft
    stage.scrollTop = anchor.scrollTop
    wheelAnchor.current = null
  }, [zoom])

  useEffect(() => {
    if (isDuo) return undefined
    const stage = stageRef.current
    if (!stage) return undefined

    function onWheel(event) {
      if (!event.ctrlKey) return
      event.preventDefault()
      const rect = stage.getBoundingClientRect()
      const pad = stagePad(stage)
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      const factor = Math.exp(-delta * 0.0015)
      setFitWidth(false)
      setZoom((current) => {
        const next = clampZoom(current * factor)
        if (next === current) return current
        const ratio = next / current
        const localX = event.clientX - rect.left + stage.scrollLeft - pad.left
        const localY = event.clientY - rect.top + stage.scrollTop - pad.top
        wheelAnchor.current = {
          scrollLeft: pad.left + localX * ratio - (event.clientX - rect.left),
          scrollTop: pad.top + localY * ratio - (event.clientY - rect.top),
        }
        return next
      })
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [isDuo])

  function zoomBy(factor) {
    const stage = stageRef.current
    setFitWidth(false)
    setZoom((current) => {
      const next = clampZoom(current * factor)
      if (!stage || next === current) return next
      const pad = stagePad(stage)
      const ratio = next / current
      const centerX = stage.clientWidth / 2
      const centerY = stage.clientHeight / 2
      const localX = centerX + stage.scrollLeft - pad.left
      const localY = centerY + stage.scrollTop - pad.top
      wheelAnchor.current = {
        scrollLeft: pad.left + localX * ratio - centerX,
        scrollTop: pad.top + localY * ratio - centerY,
      }
      return next
    })
  }

  if (isDuo) {
    const finalMatch = tournament.matches[0]
    return (
      <section className="bracket-view">
        <BracketIntro playerCount={tournament.playerCount} size={tournament.size} byes={byes} />
        <div className="duo">
          <div className="duo-player duo-player-left">
            <MatchCard match={finalMatch} onName={onName} onWinner={onWinner} single="A" />
          </div>
          <FinalMark champion={champion} />
          <div className="duo-player duo-player-right">
            <MatchCard match={finalMatch} onName={onName} onWinner={onWinner} single="B" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="bracket-view">
      <BracketIntro playerCount={tournament.playerCount} size={tournament.size} byes={byes} />
      <div className="stage" ref={stageRef}>
        <div
          className="zoom-sizer"
          style={{ width: layout.totalWidth * zoom, height: sheetHeight * zoom }}
        >
          <div
            className="sheet"
            ref={sheetRef}
            style={{ width: layout.totalWidth, transform: `scale(${zoom})` }}
          >
          <div className="column-labels">
            {layout.columnLabels.map((label) => (
              <span key={`${label.text}-${label.x}`} style={{ left: label.x, width: CARD_W }}>
                {label.text}
              </span>
            ))}
          </div>
          <div className="board" style={{ height: layout.boardHeight }}>
            <svg className="wires" width={layout.totalWidth} height={layout.boardHeight} aria-hidden="true">
              {layout.paths.map((path) => (
                <path key={path.id} d={path.d} />
              ))}
            </svg>
            <div
              className="final-banner"
              style={{ left: layout.finalX, top: layout.finalTop - 92, width: CARD_W }}
            >
              <span className="king" aria-hidden="true">
                ♔
              </span>
              <h2>FINAL</h2>
            </div>
            <div className="card-abs" style={{ left: layout.finalX, top: layout.finalTop }}>
              <MatchCard
                match={layout.finalMatch}
                onName={onName}
                onWinner={onWinner}
                featured
              />
            </div>
            {champion && (
              <p className="champion champion-abs" style={{ left: layout.finalX, top: layout.finalTop + CARD_H + 14, width: CARD_W }}>
                Campeón
                <strong>{champion}</strong>
              </p>
            )}
            {layout.cards.map(({ match, x, y }) => (
              <div key={match.id} className="card-abs" style={{ left: x, top: y }}>
                <MatchCard match={match} onName={onName} onWinner={onWinner} />
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
      <div className="zoom-bar" role="toolbar" aria-label="Zoom del cuadro">
        <button
          className="zoom-btn"
          type="button"
          aria-label="Alejar"
          disabled={zoom <= MIN_ZOOM + 0.001}
          onClick={() => zoomBy(1 / ZOOM_STEP)}
        >
          −
        </button>
        <span className="zoom-pct">{Math.round(zoom * 100)}%</span>
        <button
          className="zoom-btn"
          type="button"
          aria-label="Acercar"
          disabled={zoom >= MAX_ZOOM - 0.001}
          onClick={() => zoomBy(ZOOM_STEP)}
        >
          +
        </button>
        <button className="zoom-fit" type="button" onClick={() => setFitWidth(true)}>
          Ambos lados
        </button>
      </div>
    </section>
  )
}

function BracketIntro({ playerCount, size, byes }) {
  return (
    <p className="hint">
      {playerCount} jugadores · cuadro de {size}. Escribe cada nombre y pulsa el círculo de quien pasa de fase.
      {byes > 0
        ? ' Quien no tiene rival pasa directo al escribir su nombre.'
        : ''}
    </p>
  )
}
