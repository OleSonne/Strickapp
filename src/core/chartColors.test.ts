import { describe, expect, it } from 'vitest'
import { parseBackup, toBackup } from './backup'
import { colorParts, readCells, rowRuns, type Pixels } from './chartColors'
import { addChart, addSteps, createProject, type Chart } from './project'

const BLACK = [10, 10, 10]
const WHITE = [250, 250, 250]
const RED = [200, 30, 30]

/** Bild mit grauen Gitterlinien, oberste Zeile zuerst. */
function image(lines: number[][][], size = 12, jitter = 0): Pixels {
  const width = lines[0]!.length * size
  const height = lines.length * size
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const grid = x % size === 0 || y % size === 0
      const c = grid ? [128, 128, 128] : lines[Math.floor(y / size)]![Math.floor(x / size)]!
      data.set([...c.map((v) => v + (((x * 7 + y * 3) % 5) - 2) * jitter), 255], (y * width + x) * 4)
    }
  }
  return { data, width, height }
}

describe('Farben der Strickschrift', () => {
  it('liest Kästchen, unterste Reihe zuerst', () => {
    const found = readCells(image([[WHITE, WHITE, BLACK], [BLACK, WHITE, WHITE]]), 2, 3)!
    expect(found.cells).toEqual([[1, 0, 0], [0, 0, 1]])
    expect(found.hex).toEqual(['#fafafa', '#0a0a0a'])
  })
  it('verträgt Bildrauschen und mehr als zwei Farben', () => {
    const found = readCells(image([[WHITE, RED, BLACK, WHITE]], 12, 4), 1, 4)!
    expect(found.cells[0]![0]).toBe(found.cells[0]![3])
    expect(new Set(found.cells[0]).size).toBe(3)
  })
  it('gibt bei zu vielen Farben auf', () => {
    const many = Array.from({ length: 9 }, (_, i) => [(i % 3) * 120, Math.floor(i / 3) * 120, i === 8 ? 0 : 60])
    expect(readCells(image([many]), 1, 9)).toBeNull()
  })

  const chart: Chart = {
    id: 'c', page: 1, x: 0, y: 0, w: 1, h: 1, rows: 2, stitches: 4, inRounds: false,
    colors: [{ hex: '#ffffff', name: 'A' }, { hex: '#000000', name: 'B' }], cells: [[0, 0, 0, 1], [1, 1, 0, 0]],
  }
  const short = (c: Chart, row: number) => rowRuns(c, row).map((r) => `${r.count}${r.color.name}`).join(' ')
  it('fasst Maschen in Strickrichtung zusammen', () => {
    expect(short(chart, 1)).toBe('1B 3A')
    expect(short(chart, 2)).toBe('2B 2A')
    expect(short({ ...chart, inRounds: true }, 2)).toBe('2A 2B')
  })
  it('kommt ohne Farben aus', () => {
    const { colors: _c, cells: _e, ...plain } = chart
    expect(rowRuns(plain, 1)).toEqual([])
  })
  it('übersteht die Sicherung und lehnt kaputte Farben ab', () => {
    const p = addSteps(createProject('x', 1), ['a'])
    const { id: _id, ...data } = chart
    const q = addChart(p, p.steps[0]!.id, data)
    expect(parseBackup(toBackup([q]))).toEqual([q])
    const broken = { ...q, charts: [{ ...q.charts[0]!, cells: [[0, 0, 0, 7], [1, 1, 0, 0]] }] }
    expect(() => parseBackup(toBackup([broken]))).toThrow('beschädigt')
  })
})

describe('Farben im Text', () => {
  const marked = (text: string) => colorParts(text).filter((p) => p.color).map((p) => p.color).join('')
  it('findet deutsche und englische Angaben', () => {
    expect(marked('k1 color A, p1 color B')).toBe('AB')
    expect(marked('Lege Farbe D an. Change to Colour C.')).toBe('DC')
    expect(marked('Schneide Farbe A und B ab.')).toBe('AB')
  })
  it('verändert den Text nicht und markiert nichts Falsches', () => {
    for (const text of ['Farbe A und B ab', 'color a bit', 'die Farbe Altrosa', 'Farbe A and a half', '', 'Farbe B']) {
      expect(colorParts(text).map((p) => p.text).join('')).toBe(text)
    }
    expect(marked('color a bit, Farbe Altrosa')).toBe('')
    expect(marked('Farbe A and a half')).toBe('A')
  })
})
