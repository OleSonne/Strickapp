import type { Pixels } from './chartColors'

/** Gefundenes Gitter in Bildpunkten. */
export interface Grid {
  x: number
  y: number
  w: number
  h: number
  rows: number
  stitches: number
}

/** Blasse Linien müssen reichen, Rauschen nicht. */
const CONTRAST = 12
/** Kreuzende Linien unterbrechen eine Kante kurz. */
const GAP = 5
const MIN_RUN = 40
const MIN_CELL = 6
/** Kleineres sind eher QR-Codes oder Schrift. Anteil an der Bildbreite. */
const MIN_SIZE = 0.1

/**
 * Sucht regelmäßige Gitter. Lange gerade Kanten werden zu Gebieten verbunden, in jedem
 * Gebiet müssen die Linien beider Richtungen gleiche Abstände haben. Größtes zuerst.
 */
export function findGrids(p: Pixels): Grid[] {
  const { width, height } = p
  const vertical = edges(p, 4)
  const horizontal = edges(p, width * 4)
  const lines = new Uint8Array(width * height)
  for (let x = 0; x < width; x += 1) markRuns(vertical, lines, x, width, height)
  for (let y = 0; y < height; y += 1) markRuns(horizontal, lines, y * width, 1, width)

  const grids: Grid[] = []
  for (const box of regions(lines, width, height)) {
    const columns = fit(profile(vertical, width, box, true), box.left, box.right)
    const rows = fit(profile(horizontal, width, box, false), box.top, box.bottom)
    if (!columns || !rows || columns.count > 500 || rows.count > 300) continue
    // Tabellen haben meist breite Felder, Kästchen sind annähernd quadratisch.
    const aspect = columns.period / rows.period
    if (aspect < 0.4 || aspect > 2.5) continue
    if (Math.max(columns.period * columns.count, rows.period * rows.count) < width * MIN_SIZE) continue
    const x = Math.max(0, columns.start)
    const y = Math.max(0, rows.start)
    grids.push({
      x, y,
      w: Math.min(width, columns.start + columns.period * columns.count) - x,
      h: Math.min(height, rows.start + rows.period * rows.count) - y,
      rows: rows.count, stitches: columns.count,
    })
  }
  return grids.sort((a, b) => b.rows * b.stitches - a.rows * a.stitches)
}

/** Punkte, deren Nachbarn (im Abstand `step` im Puffer) sich unterscheiden. */
function edges({ data, width, height }: Pixels, step: number): Uint8Array {
  const result = new Uint8Array(width * height)
  const sideways = step === 4
  for (let y = sideways ? 0 : 1; y < (sideways ? height : height - 1); y += 1) {
    for (let x = sideways ? 1 : 0; x < (sideways ? width - 1 : width); x += 1) {
      const at = (y * width + x) * 4
      for (let c = 0; c < 3; c += 1) {
        if (Math.abs(data[at + step + c]! - data[at - step + c]!) >= CONTRAST) result[y * width + x] = 1
      }
    }
  }
  return result
}

function markRuns(source: Uint8Array, target: Uint8Array, start: number, step: number, length: number) {
  let first = -1
  let last = -1
  for (let i = 0; i <= length; i += 1) {
    const on = i < length && source[start + i * step] === 1
    if (on) {
      if (first < 0) first = i
      last = i
    }
    if (first >= 0 && (i === length || i - last > GAP)) {
      if (last - first + 1 >= MIN_RUN) for (let j = first; j <= last; j += 1) target[start + j * step] = 1
      first = -1
    }
  }
}

interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

/** Zusammenhängende Linien als umschließende Rechtecke. Leert `lines`. */
function regions(lines: Uint8Array, width: number, height: number): Box[] {
  const boxes: Box[] = []
  const stack: number[] = []
  for (let seed = 0; seed < lines.length; seed += 1) {
    if (!lines[seed]) continue
    const box = { left: width, top: height, right: 0, bottom: 0 }
    lines[seed] = 0
    stack.push(seed)
    while (stack.length > 0) {
      const at = stack.pop()!
      const x = at % width
      const y = (at - x) / width
      box.left = Math.min(box.left, x)
      box.right = Math.max(box.right, x)
      box.top = Math.min(box.top, y)
      box.bottom = Math.max(box.bottom, y)
      // Zwei Punkte weit, weil Kanten beiderseits der Linie liegen.
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const next = ny * width + nx
          if (lines[next]) {
            lines[next] = 0
            stack.push(next)
          }
        }
      }
    }
    if (box.right - box.left >= MIN_RUN && box.bottom - box.top >= MIN_RUN) boxes.push(box)
  }
  return boxes
}

/** Anteil der Kantenpunkte je Spalte (oder Zeile) des Gebiets. */
function profile(source: Uint8Array, width: number, box: Box, columns: boolean): number[] {
  const along = columns ? box.right - box.left + 1 : box.bottom - box.top + 1
  const across = columns ? box.bottom - box.top + 1 : box.right - box.left + 1
  return Array.from({ length: along }, (_, i) => {
    let sum = 0
    for (let j = 0; j < across; j += 1) {
      sum += columns ? source[(box.top + j) * width + box.left + i]! : source[(box.top + i) * width + box.left + j]!
    }
    return sum / across
  })
}

/** Gleichmäßige Linien: Anfang, Abstand und Anzahl der Felder. */
function fit(values: number[], from: number, to: number): { start: number; period: number; count: number } | null {
  // Beide Kanten einer Linie ergeben eine Spitze.
  const peaks: { first: number; last: number }[] = []
  values.forEach((v, i) => {
    if (v < 0.45) return
    const open = peaks.at(-1)
    if (open && i - open.last <= 3) open.last = i
    else peaks.push({ first: i, last: i })
  })
  // Breite Flächen sind Fotos, keine Linien.
  const centers = peaks.filter((q) => q.last - q.first < 8).map((q) => from + (q.first + q.last) / 2)
  if (centers.length < 3 || centers.length < peaks.length * 0.8) return null

  const gaps = centers.slice(1).map((c, i) => c - centers[i]!).sort((a, b) => a - b)
  let period = gaps[Math.floor(gaps.length / 2)]!
  let start = centers[0]!
  for (let round = 0; round < 4; round += 1) {
    // Schrittweise zählen, damit sich kleine Fehler im Abstand nicht summieren.
    const index: number[] = [0]
    for (let i = 1; i < centers.length; i += 1) {
      index.push(index[i - 1]! + Math.round((centers[i]! - centers[i - 1]!) / period))
    }
    const meanIndex = index.reduce((a, b) => a + b, 0) / index.length
    const meanCenter = centers.reduce((a, b) => a + b, 0) / centers.length
    const spread = index.reduce((a, n) => a + (n - meanIndex) ** 2, 0)
    if (spread === 0) return null
    period = index.reduce((a, n, i) => a + (n - meanIndex) * (centers[i]! - meanCenter), 0) / spread
    start = meanCenter - meanIndex * period
  }
  if (period < MIN_CELL) return null
  const fitting = new Set<number>()
  let off = 0
  for (const c of centers) {
    const n = Math.round((c - start) / period)
    if (Math.abs(c - start - n * period) > Math.max(1.5, period * 0.15)) off += 1
    else fitting.add(n)
  }
  // Fehlt der Außenrand, reichen die Querlinien bis dorthin.
  const before = Math.round((start - from) / period)
  const count = Math.round((to - start) / period) + before
  if (count < 3 || off > centers.length * 0.1 || fitting.size < (count + 1) * 0.6) return null
  return { start: start - before * period, period, count }
}
