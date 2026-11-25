import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { cellRuns, inkOn } from '../core/chartColors'
import { chartRow, type Chart } from '../core/project'

const CELL = 20
const SIDE = 34
const HEAD = 22
const LOW = 24
const HIGH = 60

/** Senkrechte Linien zwischen den Maschen, `every` zählt ab dem Reihenanfang. */
const columnLines = (stitches: number, fromRight: boolean, every: number, x0: number, y1: number, y2: number) =>
  Array.from({ length: stitches + 1 }, (_, n) => n)
    .filter((n) => n % every === 0)
    .map((n) => `M${x0 + (fromRight ? stitches - n : n) * CELL} ${y1}V${y2}`)
    .join('')

/** Heller Rand um dunkle Linien, damit sie auf jeder Garnfarbe sichtbar sind. */
function Lines({ d, width }: { d: string; width: number }) {
  return (
    <>
      <path d={d} stroke="#fff" strokeWidth={width + 2} fill="none" />
      <path d={d} stroke="#111" strokeWidth={width} fill="none" />
    </>
  )
}

/** Nachgezeichnete Strickschrift: aktuelle Reihe groß mit Nachbarn, darunter alles. */
export function ChartGrid({ chart, row, children }: { chart: Chart; row: number; children: ReactNode }) {
  return (
    <>
      <RowWindow chart={chart} row={row} />
      {children}
      <Whole chart={chart} row={row} />
    </>
  )
}

function RowWindow({ chart, row }: { chart: Chart; row: number }) {
  const scroller = useRef<HTMLDivElement>(null)
  const { fromRight } = chartRow(chart, row)
  const { stitches } = chart
  const colors = chart.colors!

  // Passt die Reihe nicht auf den Schirm, dort beginnen, wo gestrickt wird.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = fromRight ? el.scrollWidth : 0
  }, [row, fromRight, chart])

  const x0 = fromRight ? 4 : SIDE
  const width = stitches * CELL
  const total = width + SIDE + 4
  let y = HEAD
  const bands = [row + 1, row, row - 1].flatMap((n) => {
    const cells = chart.cells![n - 1]
    if (!cells) return []
    const height = n === row ? HIGH : LOW
    const band = { n, cells, y, height }
    y += height
    return [band]
  })
  const current = bands.find((b) => b.n === row)!
  const name = chart.inRounds ? 'Runde' : 'Reihe'
  return (
    <div ref={scroller} className="grid-row" tabIndex={0} role="group" aria-label={`Gitter, ${name} ${row}`}>
      <svg data-testid="grid-row" viewBox={`0 0 ${total} ${y + 4}`} aria-hidden="true"
        style={{ minWidth: stitches * 18 + SIDE, maxWidth: stitches * 48 + SIDE }}>
        {Array.from({ length: stitches }, (_, i) => i + 1).filter((n) => n === 1 || n % 5 === 0).map((n) => (
          <text key={n} x={x0 + ((fromRight ? stitches - n : n - 1) + 0.5) * CELL} y={HEAD - 7} textAnchor="middle" fontSize="13">{n}</text>
        ))}
        {bands.map((b) => (
          <g key={b.n}>
            <rect x={x0} y={b.y} width={width} height={b.height} fill="#fff" />
            <g opacity={b.n === row ? 1 : 0.45}>
              {cellRuns(b.cells).map((r) => (
                <rect key={r.from} x={x0 + r.from * CELL} y={b.y} width={r.count * CELL} height={b.height} fill={colors[r.color]!.hex} />
              ))}
            </g>
            <path d={columnLines(stitches, fromRight, 1, x0, b.y, b.y + b.height)} stroke="#808080" strokeWidth="1" fill="none" />
            <rect x={x0} y={b.y} width={width} height={b.height} fill="none" stroke="#808080" strokeWidth="1" />
            <text className={b.n === row ? undefined : 'other'} x={fromRight ? x0 + width + 8 : SIDE - 8}
              textAnchor={fromRight ? 'start' : 'end'} y={b.y + b.height / 2 + 5}
              fontSize={b.n === row ? 16 : 13} fontWeight={b.n === row ? 700 : 400}>{b.n}</text>
          </g>
        ))}
        <Lines d={columnLines(stitches, fromRight, 10, x0, HEAD, y)} width={2} />
        <rect className="halo" x={x0} y={current.y} width={width} height={HIGH} strokeWidth="7" />
        <rect className="frame" x={x0} y={current.y} width={width} height={HIGH} strokeWidth="4" />
        {cellRuns(current.cells).map((r) => {
          const color = colors[r.color]!.hex
          const ink = inkOn(color)
          const x = x0 + (r.from + r.count / 2) * CELL
          // Zahl auf eigener Fläche, sonst verschwimmt sie mit den Linien.
          const half = r.count > 99 ? 16 : r.count > 9 ? 11 : 7
          return (
            <g key={r.from}>
              <rect x={x - half} y={current.y + HIGH / 2 - 10} width={half * 2} height={20} rx="4" fill={color} />
              <text x={x} y={current.y + HIGH / 2 + 5.5} textAnchor="middle" fontSize="16" fontWeight="700" style={{ fill: ink }}>{r.count}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function Whole({ chart, row }: { chart: Chart; row: number }) {
  const { rows, stitches } = chart
  // Seitenverhältnis der Kästchen auf der Seite ist unbekannt, nahezu quadratisch genügt.
  const width = stitches * CELL
  const height = rows * CELL
  const base = useMemo(() => (
    <>
      {chart.cells!.map((cells, i) => cellRuns(cells).map((r) => (
        <rect key={`${i}-${r.from}`} x={SIDE + r.from * CELL} y={(rows - 1 - i) * CELL} width={r.count * CELL} height={CELL}
          fill={chart.colors![r.color]!.hex} />
      )))}
      <path stroke="#808080" strokeWidth="1" fill="none" d={columnLines(stitches, true, 1, SIDE, 0, height) +
        Array.from({ length: rows + 1 }, (_, n) => `M${SIDE} ${n * CELL}H${SIDE + width}`).join('')} />
      <Lines width={2} d={columnLines(stitches, true, 10, SIDE, 0, height) +
        Array.from({ length: Math.floor(rows / 10) }, (_, n) => `M${SIDE} ${height - (n + 1) * 10 * CELL}H${SIDE + width}`).join('')} />
    </>
  ), [chart, rows, stitches, width, height])
  const top = (rows - row) * CELL
  return (
    <svg className="grid-whole" data-testid="grid-whole" viewBox={`0 -5 ${SIDE + width + 6} ${height + 10}`} role="img"
      aria-label={`Ganze Strickschrift, ${chart.inRounds ? 'Runde' : 'Reihe'} ${row} ist markiert`}>
      {base}
      {/* Gestricktes tritt zurück. */}
      <rect x={SIDE} y={top + CELL} width={width} height={height - top - CELL} fill="#808080" opacity="0.45" />
      {Array.from({ length: rows }, (_, i) => i + 1).filter((n) => n === row || n === 1 || (n % 5 === 0 && Math.abs(n - row) > 1)).map((n) => (
        <text key={n} x={SIDE - 8} y={(rows - n + 0.5) * CELL + 6} textAnchor="end" fontSize="17"
          fontWeight={n === row ? 700 : 400}>{n}</text>
      ))}
      <rect className="halo" x={SIDE} y={top} width={width} height={CELL} strokeWidth="9" />
      <rect className="frame" x={SIDE} y={top} width={width} height={CELL} strokeWidth="5" />
    </svg>
  )
}
