import { useEffect, useRef, useState } from 'react'
import { chartRow, type Chart } from '../core/project'
import { rowRuns } from '../core/chartColors'
import { pageImage } from '../data/pageCache'

/** Vergrößerte aktuelle Reihe und darunter die ganze Strickschrift mit Markierung. */
export function ChartRows({ projectId, chart, row }: { projectId: string; chart: Chart; row: number }) {
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
        c.strokeStyle = '#c2410c'
        c.lineWidth = 4
        c.strokeRect(2, s.height / 4, s.width - 4, s.height / 2)

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
  }, [projectId, chart, row, top, height])

  const runs = rowRuns(chart, row)
  const cells = chart.cells?.[row - 1]
  const direction = fromRight ? '← von rechts nach links lesen' : 'von links nach rechts lesen →'
  return (
    <div className="chart-rows">
      {error && <p className="error" role="alert">{error}</p>}
      <p>
        <strong>{chart.inRounds ? 'Runde' : 'Reihe'} {row} von {chart.rows}</strong>, {direction}
      </p>
      {runs.length > 0 && (
        <ol className="runs" aria-label="Maschen in Strickrichtung">
          {runs.map((run, i) => (
            <li key={i}>
              <span className="swatch" style={{ background: run.color.hex }} aria-hidden="true" />
              {run.count} × {run.color.name}
            </li>
          ))}
        </ol>
      )}
      <canvas ref={strip} className="strip" role="img" aria-label={`Strickschrift, ${chart.inRounds ? 'Runde' : 'Reihe'} ${row}`} />
      {cells && chart.colors && (
        <div>
          <small>So wurde die Reihe erkannt. Sie muss zum Bild darüber passen:</small>
          <div className="cells" aria-hidden="true">
            {cells.map((c, i) => <span key={i} style={{ background: chart.colors![c]!.hex }} />)}
          </div>
        </div>
      )}
      <canvas ref={whole} className="whole" role="img" aria-label="Ganze Strickschrift" />
    </div>
  )
}
