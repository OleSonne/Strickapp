/** Textstück aus einer PDF-Seite, Ursprung oben links. */
export interface TextItem {
  str: string
  x: number
  y: number
  w: number
  size: number
  page: number
  font: string
}

export interface Line {
  text: string
  page: number
  /** Beginnt einen neuen Absatz. */
  paragraph: boolean
  /** Ganze Zeile hervorgehoben (größer oder andere Schrift als der Fließtext). */
  emphasis: boolean
  /** Deutlich größer als der Fließtext. */
  large: boolean
  /** Nummer des Spaltenblocks und Spalte, falls Text nebeneinander steht. */
  columns?: { block: number; side: 0 | 1 }
}

interface Segment {
  text: string
  x: number
  end: number
  y: number
  size: number
  font: string
}

const isPageNumber = (row?: Segment[]) => row?.length === 1 && /^\d{1,3}\.?$/.test(row[0]!.text.trim())

const LABEL_END = /:\s*$/

export function toLines(items: TextItem[]): Line[] {
  const body = bodyStyle(items)
  const result: Line[] = []
  let block = 0
  for (const page of [...new Set(items.map((i) => i.page))].sort((a, b) => a - b)) {
    const rows = toRows(items.filter((i) => i.page === page && i.str.trim()))
    // Seitenzahlen am Rand
    if (isPageNumber(rows.at(-1))) rows.pop()
    if (isPageNumber(rows[0])) rows.shift()
    for (let r = 0; r < rows.length; ) {
      const row = rows[r]!
      if (row.length < 2) {
        push(result, row, page, body)
        r += 1
        continue
      }
      // Spaltenblock: so weit, wie keine Zeile über die Spaltengrenze läuft.
      const boundary = row[1]!.x
      let end = r + 1
      let lastSplit = r
      while (end < rows.length && fits(rows[end]!, boundary)) {
        if (rows[end]!.length > 1 || rows[end]![0]!.x >= boundary - 5) lastSplit = end
        end += 1
      }
      block += 1
      const inside = rows.slice(r, lastSplit + 1)
      for (const side of [0, 1] as const) {
        for (const line of inside) {
          const own = line.filter((s) => (s.x >= boundary - 5 ? 1 : 0) === side)
          if (own.length) push(result, own, page, body, { block, side })
        }
      }
      r = lastSplit + 1
    }
  }
  return markParagraphs(result)
}

/** Für eingefügten Text ohne Positionen. */
export function textToLines(text: string): Line[] {
  let blank = true
  const lines: Line[] = []
  for (const raw of text.split(/\r?\n|\r/)) {
    const value = raw.trim()
    if (!value) {
      blank = true
      continue
    }
    const emphasis = value.length < 50 && (LABEL_END.test(value) || (value === value.toUpperCase() && /[A-ZÄÖÜ]{3}/.test(value)))
    lines.push({ text: value, page: 0, paragraph: blank, emphasis: emphasis && blank, large: false })
    blank = false
  }
  return lines
}

interface Measured extends Line {
  y: number
  size: number
  end: number
}

function push(result: Line[], row: Segment[], page: number, body: Style, columns?: Line['columns']) {
  const size = Math.max(...row.map((s) => s.size))
  const line: Measured = {
    text: row.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim(),
    page,
    paragraph: false,
    large: size > body.size * 1.15,
    emphasis: size > body.size * 1.15 || row.every((s) => s.font !== body.font && s.font !== ''),
    y: row[0]!.y,
    size,
    end: Math.max(...row.map((s) => s.end)),
    ...(columns && { columns }),
  }
  if (line.text) result.push(line)
}

function markParagraphs(lines: Line[]): Line[] {
  const measured = lines as Measured[]
  const right = new Map<string, number>()
  const area = (l: Measured) => `${l.page}/${l.columns?.block ?? ''}/${l.columns?.side ?? ''}`
  for (const l of measured) right.set(area(l), Math.max(right.get(area(l)) ?? 0, l.end))
  return measured.map((l, i) => {
    const previous = measured[i - 1]
    const sameArea = previous && area(previous) === area(l)
    const shortEnd = previous && /[.!?)\]]$/.test(previous.text) && previous.end < right.get(area(previous))! * 0.88
    const paragraph = !sameArea
      ? !previous || previous.page === l.page || /[.!?:\])]$/.test(previous.text) || previous.end < right.get(area(previous))! * 0.88
      : l.y - previous.y > l.size * 1.95 || Boolean(shortEnd)
    const { y: _y, size: _s, end: _e, ...line } = l
    return { ...line, paragraph }
  })
}

const fits = (row: Segment[], boundary: number) =>
  row.every((s) => s.end < boundary + 2 || s.x >= boundary - 5)

function toRows(items: TextItem[]): Segment[][] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
  const groups: TextItem[][] = []
  for (const item of sorted) {
    const last = groups.at(-1)
    // Fettschrift wird manchmal durch doppelten Druck nachgeahmt.
    if (last?.some((o) => o.str === item.str && Math.abs(o.x - item.x) < item.size * 0.15 && Math.abs(o.y - item.y) < item.size * 0.15)) continue
    if (last && Math.abs(last[0]!.y - item.y) < Math.min(item.size, last[0]!.size) * 0.4) last.push(item)
    else groups.push([item])
  }
  return groups.map((group) => {
    const segments: Segment[] = []
    for (const item of group.sort((a, b) => a.x - b.x)) {
      const last = segments.at(-1)
      const gap = last ? item.x - last.end : Infinity
      if (last && (gap < item.size * 1.8 || isLabel(last.text, item.str))) {
        last.text += (gap > item.size * 0.12 ? ' ' : '') + item.str
        last.end = Math.max(last.end, item.x + item.w)
        if (last.font !== item.font) last.font = ''
      } else {
        segments.push({ text: item.str, x: item.x, end: item.x + item.w, y: item.y, size: item.size, font: item.font })
      }
    }
    // Mehr als zwei Teile sind eher Tabellen: als eine Zeile lesen.
    if (segments.length > 2) {
      const first = segments[0]!
      return [{ ...first, text: segments.map((s) => s.text).join(' '), end: segments.at(-1)!.end }]
    }
    return segments
  })
}

/** „1. Reihe:   Stricke …“ ist eine Zeile, „Linker Fuß:   Rechter Fuß:“ sind zwei Spalten. */
const isLabel = (left: string, right: string) =>
  LABEL_END.test(left) && !LABEL_END.test(right) && !/^(Reihe|Runde|Row|Round)\b/i.test(right.trim()) && left.length < 40

interface Style {
  size: number
  font: string
}

function bodyStyle(items: TextItem[]): Style {
  const weight = new Map<string, number>()
  for (const i of items) {
    const key = `${Math.round(i.size * 2) / 2}|${i.font}`
    weight.set(key, (weight.get(key) ?? 0) + i.str.length)
  }
  const top = [...weight].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '0|'
  const [size, font] = top.split('|')
  return { size: Number(size), font: font ?? '' }
}
