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
  /** Kurze, weit verteilte Textstücke, z. B. Beschriftungen einer Zeichnung. */
  scattered?: boolean
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
  scattered?: boolean
}

const isPageNumber = (row?: Segment[]) => row?.length === 1 && /^\d{1,3}\.?$/.test(row[0]!.text.trim())

export const TIP_START = /^[([]?\s*(?:tipps?|tips?|hinweise?|achtung|note|optional)\b\s*[:!]/i

const LABEL_END = /:\s*$/

export function toLines(all: TextItem[]): Line[] {
  const body = bodyStyle(all)
  const boxes = findTipBoxes(all, body)
  const boxed = new Set(boxes.flatMap((b) => b.items))
  const items = all.filter((i) => !boxed.has(i))
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
  return markParagraphs(result, boxes)
}

interface TipBox {
  items: TextItem[]
  text: string
  page: number
  y: number
}

/** Kleiner gesetzte Tipp-Kästen am Rand, die sonst mitten in den Fließtext gerieten. */
function findTipBoxes(items: TextItem[], body: Style): TipBox[] {
  const boxes: TipBox[] = []
  for (const first of items) {
    if (!TIP_START.test(first.str.trim()) || Math.abs(first.size - body.size) < body.size * 0.05) continue
    const page = items.filter((i) => i.page === first.page && i.str.trim())
    const left = Math.min(...page.map((i) => i.x))
    if (first.x < left + 100) continue
    const own = [first]
    for (const i of page.toSorted((a, b) => a.y - b.y || a.x - b.x)) {
      const lastY = Math.max(...own.map((o) => o.y))
      const from = Math.min(...own.map((o) => o.x)) - first.size * 3
      const to = Math.max(...own.map((o) => o.x + o.w)) + first.size * 3
      if (i !== first && Math.abs(i.size - first.size) < first.size * 0.04 && i.y >= first.y - 2 &&
        i.y <= lastY + first.size * 1.7 && i.x >= from && i.x + i.w <= to + first.size * 6) own.push(i)
    }
    own.sort((a, b) => (Math.abs(a.y - b.y) < first.size * 0.4 ? a.x - b.x : a.y - b.y))
    boxes.push({ items: own, text: own.map((o) => o.str.trim()).join(' '), page: first.page, y: first.y })
  }
  return boxes
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
    ...(row.some((s) => s.scattered) && { scattered: true }),
  }
  if (line.text) result.push(line)
}

function markParagraphs(lines: Line[], boxes: TipBox[]): Line[] {
  const open = [...boxes]
  const measured = lines as Measured[]
  const right = new Map<string, number>()
  const area = (l: Measured) => `${l.page}/${l.columns?.block ?? ''}/${l.columns?.side ?? ''}`
  for (const l of measured) right.set(area(l), Math.max(right.get(area(l)) ?? 0, l.end))
  const boxLine = (b: TipBox): Line => ({ text: b.text, page: b.page, paragraph: true, emphasis: false, large: false })
  const marked = measured.flatMap((l, i) => {
    const previous = measured[i - 1]
    const sameArea = previous && area(previous) === area(l)
    const shortEnd = previous && /[.!?)\]]$/.test(previous.text) && previous.end < right.get(area(previous))! * 0.88
    const paragraph = !sameArea
      ? !previous || previous.page === l.page || /[.!?:\])]$/.test(previous.text) || previous.end < right.get(area(previous))! * 0.88
      : l.y - previous.y > l.size * 1.95 || Boolean(shortEnd)
    const { y, size: _s, end: _e, ...line } = l
    // Erst am nächsten Absatz einfügen, damit kein Satz zerrissen wird.
    const due = paragraph || previous?.page !== l.page
      ? open.filter((b) => b.page < l.page || (b.page === l.page && b.y <= y))
      : []
    for (const b of due) open.splice(open.indexOf(b), 1)
    return [...due.map(boxLine), { ...line, paragraph }]
  })
  return [...marked, ...open.map(boxLine)]
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
      // Ein Tipp-Kasten steht auch dann für sich, wenn er dicht am Text liegt.
      const tipBox = TIP_START.test(item.str.trim()) && gap > item.size * 0.6
      if (last && !tipBox && (gap < item.size * 1.8 || isLabel(last.text, item.str))) {
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
      return [{ ...first, text: segments.map((s) => s.text).join(' '), end: segments.at(-1)!.end, scattered: segments.every((s) => s.text.length < 25) }]
    }
    return segments
  })
}

/** „1. Reihe:   Stricke …“ ist eine Zeile, „Linker Fuß:   Rechter Fuß:“ sind zwei Spalten. */
const isLabel = (left: string, right: string) =>
  LABEL_END.test(left) && !TIP_START.test(right.trim()) && !LABEL_END.test(right) && !/^(Reihe|Runde|Row|Round)\b/i.test(right.trim()) && left.length < 40

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
