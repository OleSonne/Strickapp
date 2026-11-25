import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChartGrid } from './ChartGrid'
import { chartRow, type Chart } from '../core/project'
import { rowRuns } from '../core/chartColors'
import { pageImage } from '../data/pageCache'

/** Linien des Gitters, jede zehnte ab dem Reihenanfang kräftig. Der helle Rand hält sie auch auf Schwarz sichtbar. */
function drawLines(c: CanvasRenderingContext2D, from: number, to: number, stitches: number, fromRight: boolean) {
  const line = (x: number, strong: boolean) => {
    for (const [color, width] of strong ? [['#fff', 7], ['#111', 3]] as const : [['#808080', 2]] as const) {
      c.strokeStyle = color
      c.lineWidth = width
      c.beginPath()
      c.moveTo(x, from)
      c.lineTo(x, to)
      c.stroke()
    }
  }
  for (const strong of [false, true]) {
    for (let n = 1; n < stitches; n += 1) {
      const x = (c.canvas.width * (fromRight ? stitches - n : n)) / stitches
      if ((n % 10 === 0) === strong) line(x, strong)
    }
  }
}

/** Nachgezeichnetes Gitter oder, ohne Farben und auf Wunsch, das Bild aus dem Original. */
export function ChartRows(props: { projectId: string; chart: Chart; row: number }) {
  const [original, setOriginal] = useState(false)
  const { chart, row } = props
  const { fromRight } = chartRow(chart, row)
  const runs = rowRuns(chart, row)
  const direction = fromRight ? '← von rechts nach links lesen' : 'von links nach rechts lesen →'
  const drawn = chart.cells !== undefined && chart.colors !== undefined
  const list = runs.length > 0 && (
    <ol className="runs" aria-label="Maschen in Strickrichtung">
      {runs.map((run, i) => (
        <li key={i}>
          <span className="swatch" style={{ background: run.color.hex }} aria-hidden="true" />
          {run.count} × {run.color.name}
        </li>
  ))}
    </ol>
  )
  return (
    <div className="chart-rows">
      <p>
        <strong>{chart.inRounds ? 'Runde' : 'Reihe'} {row} von {chart.rows}</strong>, {direction}
      </p>
      {drawn && !original ? <ChartGrid chart={chart} row={row}>{list}</ChartGrid> : <ChartImage {...props}>{list}</ChartImage>}
      {drawn && (
        <div className="actions">
          <button aria-pressed={original} onClick={() => setOriginal(!original)}>Bild aus dem Original</button>
        </div>
      )}
    </div>
  )
}

function ChartImage({ projectId, chart, row, children }: { projectId: string; chart: Chart; row: number; children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null)
  const strip = useRef<HTMLCanvasElement>(null)
  const whole = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const { top, height, fromRight } = chartRow(chart, row)

  useEffect(() => {
    let active = true
    pageImage(projectId, chart.page).then(
      ({ canvas: page }) => {
        if (!active || !strip.current || !whole.current) return
        const area = { x: chart.x * page.width, y: chart.y * page.height, w: chart.w * page.width, h: chart.h * page.height }
        const rowHeight = area.h * height
        const rowTop = area.y + area.h * top

        // Ausschnitt mit je einer halben Reihe darüber und darunter
        const zoom = Math.max(1, 1400 / area.w)
        const s = strip.current
        s.width = area.w * zoom
        s.height = rowHeight * 2 * zoom
        const c = s.getContext('2d')!
        c.fillStyle = '#fff'
        c.fillRect(0, 0, s.width, s.height)
        c.drawImage(page, area.x, rowTop - rowHeight / 2, area.w, rowHeight * 2, 0, 0, s.width, s.height)
        c.fillStyle = 'rgb(255 255 255 / .65)'
        c.fillRect(0, 0, s.width, s.height / 4)
        c.fillRect(0, s.height * 0.75, s.width, s.height / 4)
        drawLines(c, 0, s.height, chart.stitches, fromRight)
        c.strokeStyle = '#c2410c'
        c.lineWidth = 8
        c.strokeRect(4, s.height / 4, s.width - 8, s.height / 2)

        if (scroller.current) scroller.current.scrollLeft = fromRight ? scroller.current.scrollWidth : 0

        const w = whole.current
        w.width = area.w
        w.height = area.h
        const d = w.getContext('2d')!
        d.fillStyle = '#fff'
        d.fillRect(0, 0, w.width, w.height)
        d.drawImage(page, area.x, area.y, area.w, area.h, 0, 0, w.width, w.height)
        d.fillStyle = 'rgb(255 255 255 / .6)'
        d.fillRect(0, 0, w.width, w.height * top)
        d.fillRect(0, w.height * (top + height), w.width, w.height)
        d.strokeStyle = '#c2410c'
        d.lineWidth = 3
        d.strokeRect(1.5, w.height * top, w.width - 3, w.height * height)
        setError(null)
      },
      (reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason))
      },
    )
    return () => {
      active = false
    }
  }, [projectId, chart, row, top, height, fromRight])

  return (
    <>
      {error && <p className="error" role="alert">{error}</p>}
      <div ref={scroller} className="grid-row" tabIndex={0} role="group" aria-label="Aktuelle Reihe im Original">
        <canvas ref={strip} className="strip" style={{ minWidth: chart.stitches * 24 }} role="img" aria-label={`Strickschrift, ${chart.inRounds ? 'Runde' : 'Reihe'} ${row}`} />
      </div>
      {children}
      <canvas ref={whole} className="whole" role="img" aria-label="Ganze Strickschrift" />
    </>
  )
}
