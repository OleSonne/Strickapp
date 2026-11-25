import { describe, expect, it } from 'vitest'
import { cellRuns, inkOn, mixedShare } from './chartColors'
import type { Pixels } from './chartColors'
import { findGrids } from './chartGrid'

/** Seite mit Gitter. `border`: mit Außenrand. */
function page(o: { rows: number; stitches: number; cw: number; ch: number; line?: number; border?: boolean; symbol?: boolean }): Pixels {
  const width = 600
  const height = 500
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  const put = (x: number, y: number, v: number) => data.set([v, v, v], (y * width + x) * 4)
  for (let y = 0; y < o.rows * o.ch; y += 1) {
    for (let x = 0; x < o.stitches * o.cw; x += 1) {
      const col = Math.floor(x / o.cw)
      const row = Math.floor(y / o.ch)
      const edge = (x % o.cw === 0 && (o.border !== false || x > 0)) || (y % o.ch === 0 && (o.border !== false || y > 0))
      const symbol = o.symbol && Math.abs((x % o.cw) - (y % o.ch)) <= 2
      put(100 + x, 80 + y, edge ? (o.line ?? 128) : (symbol || (!o.symbol && (col * 3 + row * 5) % 7 === 0)) ? 0 : 255)
    }
  }
  if (o.border !== false) {
    for (let y = 0; y <= o.rows * o.ch; y += 1) put(100 + o.stitches * o.cw, 80 + y, o.line ?? 128)
    for (let x = 0; x <= o.stitches * o.cw; x += 1) put(100 + x, 80 + o.rows * o.ch, o.line ?? 128)
  }
  return { data, width, height }
}

describe('Gitter der Strickschrift', () => {
  it.each([
    { rows: 12, stitches: 20, cw: 20, ch: 15 },
    { rows: 26, stitches: 40, cw: 10, ch: 8 },
    { rows: 4, stitches: 6, cw: 24, ch: 24 },
    { rows: 12, stitches: 20, cw: 20, ch: 15, line: 228 },
    { rows: 12, stitches: 20, cw: 20, ch: 15, border: false },
  ])('findet $rows × $stitches (Linie $line, Rand $border)', (o) => {
    const [grid, ...rest] = findGrids(page(o))
    expect(rest).toEqual([])
    expect(grid).toMatchObject({ rows: o.rows, stitches: o.stitches })
    expect(Math.abs(grid!.x - 100)).toBeLessThan(3)
    expect(Math.abs(grid!.y - 80)).toBeLessThan(3)
    expect(Math.abs(grid!.w - o.stitches * o.cw)).toBeLessThan(5)
    expect(Math.abs(grid!.h - o.rows * o.ch)).toBeLessThan(5)
  })
  it('hält Tabellen mit breiten Feldern nicht für Gitter', () => {
    expect(findGrids(page({ rows: 12, stitches: 5, cw: 80, ch: 20 }))).toEqual([])
  })
  it('findet auf leeren, winzigen und verrauschten Seiten nichts', () => {
    const blank = new Uint8ClampedArray(200 * 200 * 4).fill(255)
    expect(findGrids({ data: blank, width: 200, height: 200 })).toEqual([])
    expect(findGrids({ data: blank, width: 1, height: 1 })).toEqual([])
    const noise = blank.map((_, i) => (i * 7919 + (i >> 3) * 104729) % 251)
    expect(findGrids({ data: noise, width: 200, height: 200 })).toEqual([])
  })
})

describe('Kästchen', () => {
  const inner = (p: Pixels, w: number, h: number): Pixels => {
    const data = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y += 1) data.set((p.data as Uint8ClampedArray).subarray(((80 + y) * p.width + 100) * 4, ((80 + y) * p.width + 100 + w) * 4), y * w * 4)
    return { data, width: w, height: h }
  }
  it('unterscheidet Farben und Symbole', () => {
    const o = { rows: 4, stitches: 6, cw: 24, ch: 24 }
    expect(mixedShare(inner(page(o), 144, 96), 4, 6)).toBe(0)
    expect(mixedShare(inner(page({ ...o, symbol: true }), 144, 96), 4, 6)).toBeGreaterThan(0.5)
  })
  it('fasst von links nach rechts zusammen', () => {
    expect(cellRuns([0, 0, 1, 0])).toEqual([{ from: 0, count: 2, color: 0 }, { from: 2, count: 1, color: 1 }, { from: 3, count: 1, color: 0 }])
    expect(cellRuns([])).toEqual([])
  })
  it('wählt lesbare Schrift', () => {
    expect([inkOn('#000000'), inkOn('#ffffff'), inkOn('#ffee00'), inkOn('#1d2a6b')]).toEqual(['#ffffff', '#000000', '#000000', '#ffffff'])
  })
})
