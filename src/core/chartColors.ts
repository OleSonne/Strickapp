import { chartRow, type Chart } from './project'

export interface ChartColor {
  hex: string
  name: string
}

export interface Pixels {
  data: ArrayLike<number>
  width: number
  height: number
}

type Rgb = [number, number, number]

const MAX_COLORS = 8
const SAME_COLOR = 70

/** Farbe jedes Kästchens. `null`, wenn es zu viele Farben sind, z. B. bei Symbolen oder Fotos. */
export function readCells(p: Pixels, rows: number, stitches: number): { hex: string[]; cells: number[][] } | null {
  const clusters: { sum: Rgb; count: number }[] = []
  const cells: number[][] = []
  // Reihe 1 ist unten.
  for (let row = rows - 1; row >= 0; row -= 1) {
    const line: number[] = []
    for (let col = 0; col < stitches; col += 1) {
      const color = cellColor(p, row, col, rows, stitches)
      let best = clusters.findIndex((c) => distance(mean(c), color) < SAME_COLOR)
      for (const [i, c] of clusters.entries()) {
        if (best >= 0 && distance(mean(c), color) < distance(mean(clusters[best]!), color)) best = i
      }
      if (best < 0) {
        if (clusters.length === MAX_COLORS) return null
        best = clusters.push({ sum: [0, 0, 0], count: 0 }) - 1
      }
      const c = clusters[best]!
      c.sum = [c.sum[0] + color[0], c.sum[1] + color[1], c.sum[2] + color[2]]
      c.count += 1
      line.push(best)
    }
    cells.push(line)
  }
  // Häufigste Farbe zuerst.
  const order = clusters.map((_, i) => i).sort((a, b) => clusters[b]!.count - clusters[a]!.count)
  return {
    hex: order.map((i) => toHex(mean(clusters[i]!))),
    cells: cells.map((line) => line.map((c) => order.indexOf(c))),
  }
}

/** Mittlerer Wert der Kästchenmitte, damit Gitterlinien nicht stören. */
function cellColor(p: Pixels, row: number, col: number, rows: number, stitches: number): Rgb {
  const w = p.width / stitches
  const h = p.height / rows
  const channels: [number[], number[], number[]] = [[], [], []]
  for (let iy = 0; iy < 5; iy += 1) {
    for (let ix = 0; ix < 5; ix += 1) {
      const x = Math.min(p.width - 1, Math.floor((col + 0.3 + ix * 0.1) * w))
      const y = Math.min(p.height - 1, Math.floor((row + 0.3 + iy * 0.1) * h))
      const at = (y * p.width + x) * 4
      channels.forEach((list, i) => list.push(p.data[at + i] ?? 255))
    }
  }
  return channels.map((list) => list.sort((a, b) => a - b)[12]!) as Rgb
}

const mean = (c: { sum: Rgb; count: number }): Rgb =>
  c.count ? [c.sum[0] / c.count, c.sum[1] / c.count, c.sum[2] / c.count] : c.sum
const distance = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const toHex = (c: Rgb) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`

export interface Run {
  count: number
  color: ChartColor
}

/** Gleichfarbige Maschen einer Reihe, in Strickrichtung. */
export function rowRuns(chart: Chart, row: number): Run[] {
  const cells = chart.cells?.[row - 1]
  if (!cells || !chart.colors) return []
  const runs: Run[] = []
  for (const index of chartRow(chart, row).fromRight ? cells.toReversed() : cells) {
    const color = chart.colors[index]!
    const last = runs.at(-1)
    if (last?.color === color) last.count += 1
    else runs.push({ count: 1, color })
  }
  return runs
}

export interface TextPart {
  text: string
  /** Buchstabe der genannten Farbe. */
  color?: string
}

/** Findet „Farbe A“, „Colour B“, „Farbe A und B“ im Text. */
export function colorParts(text: string): TextPart[] {
  const parts: TextPart[] = []
  let end = 0
  const add = (value: string, color?: string) => {
    if (value) parts.push({ text: value, ...(color && { color }) })
  }
  for (const m of text.matchAll(/\b(?:Farben?|colou?rs?)\s+([A-H])\b(?:(\s*(?:und|and|,|&|\/)\s*)([A-H])\b)?/gi)) {
    if (m[1] !== m[1]!.toUpperCase()) continue
    add(text.slice(end, m.index))
    const second = m[3] && m[3] === m[3].toUpperCase() ? m[3] : undefined
    const whole = second ? m[0] : m[0].replace(/(?:\s*(?:und|and|,|&|\/)\s*)[a-z]$/i, (x) => (m[3] ? '' : x))
    const first = second ? whole.slice(0, whole.length - m[2]!.length - 1) : whole
    add(first, m[1])
    if (second) {
      add(m[2]!)
      add(second, second)
    }
    end = m.index + (second ? m[0].length : whole.length)
  }
  add(text.slice(end))
  return parts
}
