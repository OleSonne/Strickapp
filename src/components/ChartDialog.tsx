import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { readCells, type ChartColor } from '../core/chartColors'
import type { Chart } from '../core/project'
import { pageImage } from '../data/pageCache'
import { Modal } from './Dialogs'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface Props {
  projectId: string
  page: number
  onSave: (chart: Omit<Chart, 'id'>) => Promise<string | null>
  onClose: () => void
}

const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 }
const clamp = (v: number) => Math.min(Math.max(v, 0), 1)

export function ChartDialog({ projectId, page, onSave, onClose }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const fixed = useRef<{ x: number; y: number } | null>(null)
  const [current, setCurrent] = useState(page)
  const [total, setTotal] = useState(0)
  const [view, setView] = useState(FULL)
  const [rect, setRect] = useState<Rect | null>(null)
  const [rows, setRows] = useState('')
  const [stitches, setStitches] = useState('')
  const [inRounds, setInRounds] = useState(true)
  const [found, setFound] = useState<{ colors: ChartColor[]; cells: number[][] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    pageImage(projectId, current).then(
      ({ canvas: source, total: pages }) => {
        const target = canvas.current
        if (!active || !target) return
        setTotal(pages)
        const width = view.w * source.width
        const height = view.h * source.height
        const scale = 1600 / Math.max(width, height)
        target.width = width * scale
        target.height = height * scale
        target.getContext('2d')!.drawImage(source, view.x * source.width, view.y * source.height, width, height,
          0, 0, target.width, target.height)
      },
      (reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason))
      },
    )
    return () => {
      active = false
    }
  }, [projectId, current, view])

  const point = (event: PointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    return {
      x: clamp(view.x + ((event.clientX - box.left) / box.width) * view.w),
      y: clamp(view.y + ((event.clientY - box.top) / box.height) * view.h),
    }
  }

  const start = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const p = point(event)
    // Nahe einer Ecke wird diese verschoben, sonst beginnt ein neuer Rahmen.
    const near = rect && [
      [rect.x, rect.y, rect.x + rect.w, rect.y + rect.h],
      [rect.x + rect.w, rect.y, rect.x, rect.y + rect.h],
      [rect.x, rect.y + rect.h, rect.x + rect.w, rect.y],
      [rect.x + rect.w, rect.y + rect.h, rect.x, rect.y],
    ].find(([x, y]) => Math.abs(x! - p.x) < view.w * 0.06 && Math.abs(y! - p.y) < view.h * 0.06)
    fixed.current = near ? { x: near[2]!, y: near[3]! } : p
  }

  const move = (event: PointerEvent<HTMLElement>) => {
    const a = fixed.current
    if (!a) return
    const b = point(event)
    setRect({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) })
  }

  const zoomIn = () => {
    if (!rect || rect.w < 0.01 || rect.h < 0.01) return
    const margin = 0.08
    const x = clamp(rect.x - rect.w * margin)
    const y = clamp(rect.y - rect.h * margin)
    setView({ x, y, w: Math.min(1 - x, rect.w * (1 + 2 * margin)), h: Math.min(1 - y, rect.h * (1 + 2 * margin)) })
  }

  // Passt der Rahmen nicht mehr, gelten die erkannten Farben nicht mehr.
  useEffect(() => setFound(null), [rect, rows, stitches])

  const recognize = async () => {
    const r = Number(rows)
    const s = Number(stitches)
    if (!rect || !(Number.isSafeInteger(r) && r >= 1 && r <= 300) || !(Number.isSafeInteger(s) && s >= 1 && s <= 500)) {
      return setError('Gib zuerst Reihen und Maschen an.')
    }
    try {
      const { canvas: page } = await pageImage(projectId, current)
      const x = Math.floor(rect.x * page.width)
      const y = Math.floor(rect.y * page.height)
      const width = Math.max(1, Math.min(page.width - x, Math.round(rect.w * page.width)))
      const height = Math.max(1, Math.min(page.height - y, Math.round(rect.h * page.height)))
      const image = page.getContext('2d')!.getImageData(x, y, width, height)
      const result = readCells(image, r, s)
      if (!result) return setError('Die Farben sind nicht eindeutig. Prüfe den Rahmen oder lege die Reihen ohne Farben an.')
      setError(null)
      setFound({ cells: result.cells, colors: result.hex.map((hex, i) => ({ hex, name: `Farbe ${'ABCDEFGH'[i]}` })) })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  const turn = (to: number) => {
    setCurrent(to)
    setRect(null)
    setView(FULL)
  }

  const lines = (count: string, max: number) => {
    const n = Number(count)
    return Number.isSafeInteger(n) && n > 1 && n <= max ? Array.from({ length: n - 1 }, (_, i) => (i + 1) / n) : []
  }

  return (
    <Modal title="Strickschrift einrichten" onClose={onClose} wide>
      <p>Ziehe einen Rahmen genau um die Kästchen, ohne die Zahlen am Rand. Vergrößere dann und schiebe die Ecken zurecht.</p>
      <div className="chart-area" data-testid="chart-area" onPointerDown={start} onPointerMove={move}
        onPointerUp={() => { fixed.current = null }} onPointerCancel={() => { fixed.current = null }}>
        <canvas ref={canvas} role="img" aria-label={`Seite ${current}`} />
        {rect && (
          <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="none" aria-hidden="true"
            fill="none" stroke="#c2410c">
            <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} strokeWidth="3" vectorEffect="non-scaling-stroke" />
            {lines(rows, 300).map((f) => (
              <line key={`r${f}`} x1={rect.x} x2={rect.x + rect.w} y1={rect.y + rect.h * f} y2={rect.y + rect.h * f}
                strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            {lines(stitches, 500).map((f) => (
              <line key={`s${f}`} y1={rect.y} y2={rect.y + rect.h} x1={rect.x + rect.w * f} x2={rect.x + rect.w * f}
                strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        )}
      </div>
      <div className="chart-fields">
        <label>Reihen<input inputMode="numeric" value={rows} onChange={(e) => setRows(e.target.value)} /></label>
        <label>Maschen<input inputMode="numeric" value={stitches} onChange={(e) => setStitches(e.target.value)} /></label>
        <label>
          Gestrickt wird
          <select value={inRounds ? 'rounds' : 'rows'} onChange={(e) => setInRounds(e.target.value === 'rounds')}>
            <option value="rounds">in Runden</option>
            <option value="rows">in Hin- und Rückreihen</option>
          </select>
        </label>
      </div>
      <p>Die roten Linien müssen auf den Kästchen liegen. Reihe 1 ist unten.</p>
      <div className="actions">
        <button disabled={!rect} onClick={() => void recognize()}>Farben erkennen</button>
      </div>
      {found && (
        <div className="found">
          <p>Vergleiche mit der Strickschrift und benenne die Farben:</p>
          <div className="actions">
            {found.colors.map((c, i) => (
              <label key={i} className="inline">
                <span className="swatch" style={{ background: c.hex }} aria-hidden="true" />
                <input aria-label={`Name der Farbe ${i + 1}`} value={c.name} onChange={(e) =>
                  setFound({ ...found, colors: found.colors.map((o, j) => (j === i ? { ...o, name: e.target.value } : o)) })} />
              </label>
            ))}
          </div>
          <div className="preview" data-testid="preview" aria-hidden="true">
            {found.cells.toReversed().map((line, i) => (
              <div key={i} className="cells">
                {line.map((c, j) => <span key={j} style={{ background: found.colors[c]!.hex }} />)}
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button disabled={current <= 1} onClick={() => turn(current - 1)}>Vorige Seite</button>
        <span className="page">{total > 0 && `${current} von ${total}`}</span>
        <button disabled={current >= total} onClick={() => turn(current + 1)}>Nächste Seite</button>
        <button disabled={!rect} onClick={zoomIn}>Vergrößern</button>
        <button disabled={view === FULL} onClick={() => setView(FULL)}>Ganze Seite</button>
        <button onClick={onClose}>Abbrechen</button>
        <button className="primary" disabled={!rect} onClick={async () => {
          const colors = found?.colors.map((c, i) => ({ ...c, name: c.name.trim() || `Farbe ${'ABCDEFGH'[i]}` }))
          const problem = await onSave({ ...rect!, ...(found && colors && { colors, cells: found.cells }), page: current, rows: Number(rows), stitches: Number(stitches), inRounds })
          if (problem) setError(problem)
          else onClose()
        }}>
          Reihen anlegen
        </button>
      </div>
    </Modal>
  )
}
