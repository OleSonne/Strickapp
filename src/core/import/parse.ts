import type { Until } from '../project'
import type { Line } from './lines'
import { countSizes, pickSize, sizeNames } from './sizes'

export interface DraftStep {
  id: string
  kind: 'heading' | 'step'
  text: string
  /** Wortlaut der Anleitung, vor Größenwahl und Auflösung von Verweisen. */
  original: string
  page: number
  section: string
  included: boolean
  warnings: string[]
}

export interface DraftRepeat {
  id: string
  stepIds: string[]
  until: Until
  original: string
  warnings: string[]
}

export interface Draft {
  steps: DraftStep[]
  repeats: DraftRepeat[]
  english: boolean
}

export interface Choices {
  size: number
  /** Gewählte Spalte je Variantenpaar, 2 bedeutet beide. */
  variants: Record<string, 0 | 1 | 2>
}

export interface Analysis {
  sizeNames: string[]
  variants: { key: string; names: [string, string] }[]
}

const ROW = /^(?:(?:Reihen?|Runden?|Rows?|Rounds?|Rnds?|R)\.?\s*(\d+)(?:\s*[-–]\s*(\d+))?(?=[\s(:.])|(\d+)\.\s*(?:Reihe|Runde)\b)[^:]{0,40}:/i
const REPEAT_START = /^(?:Rep(?:eat)?|Wiederhole|Stricke|Arbeite|Work)\s+(?:nun\s+|die\s+|diese\s+|these\s+|the\s+last\s+|die\s+letzten\s+)*(?:Reihen?|Runden?|Rows?|Rounds?|Rnds?|\d+\s+(?:Reihen|Runden|rows|rounds))\b/i
const AFTER_REPEAT = /[,;]\s+(?:then|dann|danach|anschließend)\b/i
const MANUAL_REPEAT = 'Wiederholung nicht automatisch erkannt, bitte selbst anlegen.'
const START = /^(?:anleitung|instructions?|anschlag|casting on|cast on)\b/i
const BACKGROUND = /abk(?:ü|u)rz|abbrev|material|gauge|maschenprobe|^garn|^yarn|^(?:video)?tutorials$|^größe|^sizes?\b|sizing|pflege|^tipps?\b|disclaimer|introduction|einleitung|description|measurements|^hinweis|^basics|^workflow|konstruktion|anpassungen|^to make (?:larger|smaller)|^über\b|informationen/i
const CLUTTER = /©|copyright|https?:|www\.|instagram|#\w{4,}|^@|@\w+\.\w|^\d{1,3}\.?$|all ?rights ?reserved|nur für den privaten gebrauch/i
// Hervorgehobene Anweisungen sind keine Überschriften.
const INSTRUCTION = /^(?:schlage|nimm|nehme|stricke|kette|wechsel|wiederhole|arbeite|lege|hebe|cast on \d|knit\b|purl\b|work\b|repeat\b|rep\b|continue\b|bind off\b|pick up\b)/i
const WORDS: Record<string, number> = {
  einmal: 1, zweimal: 2, dreimal: 3, once: 1, twice: 2, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8,
  neun: 9, zehn: 10, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
}
const MAX_EXPANDED_ROWS = 20

export function analyze(lines: Line[]): Analysis {
  const texts = lines.map((l) => l.text)
  // Zusammen lesen, weil Größenfolgen umbrechen können.
  const count = countSizes([texts.join(' ')])
  return { sizeNames: count > 1 ? sizeNames(texts, count) : [], variants: findVariants(lines).list }
}

function findVariants(lines: Line[]) {
  const first = new Map<number, [string?, string?]>()
  for (const l of lines) {
    if (!l.columns) continue
    const pair = first.get(l.columns.block) ?? []
    pair[l.columns.side] ??= l.text
    first.set(l.columns.block, pair)
  }
  const list: Analysis['variants'] = []
  const byBlock = new Map<number, string>()
  for (const [block, [a, b]] of first) {
    if (!a || !b || a.length > 50 || b.length > 50 || !/:$/.test(b)) continue
    const names: [string, string] = [a.replace(/:$/, ''), b.replace(/:$/, '')]
    const key = names.join(' / ')
    byBlock.set(block, key)
    if (!list.some((v) => v.key === key)) list.push({ key, names })
  }
  return { list, byBlock }
}

interface Block {
  text: string
  page: number
  heading: boolean
  columns?: Line['columns']
}

function toBlocks(lines: Line[]): Block[] {
  const blocks: Block[] = []
  for (const line of lines) {
    const last = blocks.at(-1)
    const isRow = ROW.test(line.text)
    const heading = line.emphasis && (line.large || line.paragraph) && !isRow && /^[A-ZÄÖÜ]/.test(line.text) &&
      !INSTRUCTION.test(line.text) && !/\d\s?\(\d/.test(line.text) && line.text.length < 60 && !/[.,;]$/.test(line.text) && !/^\d+$/.test(line.text)
    const sameColumn = last?.columns?.block === line.columns?.block && last?.columns?.side === line.columns?.side
    // In einer offenen Klammer geht die Reihe weiter.
    const openBracket = last !== undefined && last.text.lastIndexOf('[') > last.text.lastIndexOf(']')
    const starts = !last || heading || last.heading || (line.paragraph && !openBracket) || isRow || REPEAT_START.test(line.text) ||
      !sameColumn || CLUTTER.test(line.text)
    if (starts) {
      blocks.push({ text: line.text, page: line.page, heading, ...(line.columns && { columns: line.columns }) })
    } else {
      // Silbentrennung nur vor Kleinbuchstaben auflösen, „I-Cord“ bleibt.
      last.text = /[a-zäöüß]-$/.test(last.text) && /^[a-zäöüß]/.test(line.text)
        ? last.text.slice(0, -1) + line.text
        : `${last.text} ${line.text}`
    }
  }
  return blocks
}

const ABBREVIATION = /(?:^|[\s(.–-])(?:\d+|ca|z\.\s?B|bzw|inkl|evtl|usw|Abn|Zun|approx|e\.?g|i\.?e|etc|St|Nr|M|R|Rd)\.$/i

export function splitSentences(text: string): string[] {
  const result: string[] = []
  for (const part of text.split(/(?<=[.!?]\)?)\s+(?=[A-ZÄÖÜ([„"])/)) {
    const last = result.at(-1)
    if (last !== undefined && ABBREVIATION.test(last)) result[result.length - 1] = `${last} ${part}`
    else result.push(part)
  }
  return result.map((s) => s.trim()).filter(Boolean)
}

export function parsePattern(lines: Line[], choices: Choices): Draft {
  const count = countSizes([lines.map((l) => l.text).join(' ')])
  const variants = findVariants(lines)
  const blocks = toBlocks(lines)
  const english = isEnglish(lines)
  const hasStart = blocks.some((b) => b.heading && START.test(b.text))
  const steps: DraftStep[] = []
  const repeats: DraftRepeat[] = []
  const meta = new Map<string, { row?: number; block?: number; side?: 0 | 1 }>()
  const announced = new Map<string, number>()
  let started = !hasStart
  let background = false
  let section = ''
  let next = 0
  const lastPage = blocks.at(-1)?.page

  for (const block of blocks) {
    if (block.page === lastPage && /©|copyright/i.test(block.text)) background = true
    const key = block.columns && variants.byBlock.get(block.columns.block)
    const choice = key === undefined ? 2 : (choices.variants[key] ?? 2)
    const dropped = block.columns !== undefined && choice !== 2 && choice !== block.columns.side
    const add = (kind: DraftStep['kind'], text: string, original: string, unclear: boolean, row?: number) => {
      const id = `s${next++}`
      const warnings = kind === 'heading' ? [] : warningsFor(text, unclear, english)
      const included = started && !background && !dropped && !CLUTTER.test(original)
      steps.push({ id, kind, text, original, page: block.page, section, included, warnings })
      meta.set(id, { ...(row !== undefined && { row }), ...(block.columns && { block: block.columns.block, side: block.columns.side }) })
    }

    if (block.heading) {
      if (START.test(block.text)) started = true
      const named = key && variants.list.some((v) => v.names.includes(block.text.replace(/:$/, '')))
      if (!named) {
        background = BACKGROUND.test(block.text) || /©|copyright/i.test(block.text)
        section = block.text.replace(/:$/, '')
      }
      add('heading', block.text.replace(/:$/, ''), block.text, false)
      continue
    }

    const row = ROW.exec(block.text)
    if (row) {
      // Nummerierte Reihen sind immer Teil der Anleitung.
      if (started) background = false
      const picked = pickSize(block.text, count, choices.size)
      const from = Number(row[1] ?? row[3])
      const to = Number(row[2] ?? from)
      const range = to > from && to - from < MAX_EXPANDED_ROWS
      for (let n = from; n <= (range ? to : from); n += 1) {
        const label = range ? picked.text.replace(/^(\S+?)(?:n|s)?\s*\d+\s*[-–]\s*\d+/, `$1 ${n}`) : picked.text
        add('step', label, block.text, picked.unclear, n)
      }
      continue
    }
    for (const sentence of splitSentences(block.text)) {
      const picked = pickSize(sentence, count, choices.size)
      // „…, dann abketten“ nach einer Wiederholung ist ein eigener Schritt.
      const tail = REPEAT_START.test(sentence) ? AFTER_REPEAT.exec(sentence) : null
      const head = tail ? sentence.slice(0, tail.index) : sentence
      if (findRepeat(pickSize(head, count, choices.size).text, head)) {
        if (tail) {
          const rest = sentence.slice(tail.index).replace(/^[,;]\s*/, '')
          const pickedRest = pickSize(rest, count, choices.size)
          add('step', pickedRest.text, sentence, pickedRest.unclear)
        }
        continue
      }
      add('step', picked.text, sentence, picked.unclear)
      const total = /^(?:Stricke|Arbeite|Work|Knit)\s+(?:nun\s+)?(\d+)\s+(?:Reihen|Runden|rows|rounds)\b.*:$/i.exec(picked.text)
      if (total) {
        announced.set(steps.at(-1)!.id, Number(total[1]))
      } else if (REPEAT_START.test(picked.text) || /^(?:rep|repeat|wiederhole)\b/i.test(picked.text)) {
        steps.at(-1)!.warnings.push(MANUAL_REPEAT)
      }
    }
  }

  /** „Stricke 12 Reihen …: Reihe 1, Reihe 2“ heißt, die Reihen bis zur Gesamtzahl zu wiederholen. */
  function repeatAnnounced() {
    for (const [id, total] of announced) {
      const start = steps.findIndex((s) => s.id === id)
      let end = start + 1
      while (steps[end] && meta.get(steps[end]!.id)?.row === end - start) end += 1
      const run = steps.slice(start + 1, end)
      if (run.length === 0 || run.length === total) continue
      const free = !run.some((s) => repeats.some((r) => r.stepIds.includes(s.id)))
      if (free && total % run.length === 0) {
        repeats.push({
          id: `r${repeats.length}`, stepIds: run.map((s) => s.id), until: { kind: 'count', count: total / run.length },
          original: steps[start]!.original, warnings: [`Aus ${total} Reihen berechnet, bitte prüfen.`],
        })
      } else {
        steps[start]!.warnings.push(MANUAL_REPEAT)
      }
    }
  }

  function findRepeat(text: string, original: string): boolean {
    if (!REPEAT_START.test(text)) return false
    const parsed = parseRepeat(text)
    if (!parsed) return false
    const run = findRun(parsed, undefined)
    if (!run) return false
    const runs = [run]
    const info = meta.get(run[0]!.id)
    // Steht die Wiederholung unter zwei Spalten, gilt sie für beide.
    if (info?.side === 1) {
      const other = findRun(parsed, { block: info.block!, side: 0 })
      if (other) runs.unshift(other)
    }
    if (runs.some((r) => r.some((s) => repeats.some((x) => x.stepIds.includes(s.id))))) return false
    for (const r of runs) {
      repeats.push({
        id: `r${repeats.length}`, stepIds: r.map((s) => s.id), until: parsed.until, original, warnings: parsed.warnings,
      })
    }
    return true
  }

  /** Letzte zusammenhängende Reihen, die zur Angabe passen. */
  function findRun(p: ParsedRepeat, where?: { block: number; side: 0 | 1 }): DraftStep[] | null {
    for (let end = steps.length - 1; end >= 0; end -= 1) {
      const info = meta.get(steps[end]!.id)!
      const inPlace = !where || (info.block === where.block && info.side === where.side)
      if (info.row !== undefined && inPlace && (p.to === undefined || info.row === p.to)) {
        const run = collect(end, p.last ?? p.to! - p.from! + 1)
        if (run) return run
      }
      // Nicht über die nächste Überschrift hinaus suchen.
      const step = steps[end]!
      if (!where && step.kind === 'heading' && step.section === step.text) return null
    }
    return null
  }

  /** `size` aufeinanderfolgende Reihen rückwärts ab `end`, samt Text dazwischen. */
  function collect(end: number, size: number): DraftStep[] | null {
    const last = meta.get(steps[end]!.id)!
    let wanted = last.row!
    for (let i = end; i >= 0 && steps[i]!.kind !== 'heading'; i -= 1) {
      const info = meta.get(steps[i]!.id)!
      if (info.block !== last.block || info.side !== last.side) return null
      if (info.row === undefined) continue
      if (info.row !== wanted) return null
      wanted -= 1
      if (last.row! - wanted === size) return steps.slice(i, end + 1)
    }
    return null
  }

  repeatAnnounced()
  resolveReferences(steps, meta)
  return { steps, repeats, english }
}

interface ParsedRepeat {
  from?: number
  to?: number
  last?: number
  until: Until
  warnings: string[]
}

export function parseRepeat(text: string): ParsedRepeat | null {
  const range = /(?:Reihen?|Runden?|Rows?|Rounds?|Rnds?)\s+(\d+)\s*(?:(?:[-–&]|und|and|bis|to)\s*(\d+))?/i.exec(text)
  const last = /(?:diese|these|letzten|last)\s+(\d+)\s+(?:Reihen|Runden|rows|rounds)/i.exec(text)
  if (!range && !last) return null
  const span = last
    ? { last: Number(last[1]) }
    : { from: Number(range![1]), to: Number(range![2] ?? range![1]) }
  if (span.last === undefined && span.to! < span.from!) return null
  if (span.last === 0) return null
  const rest = text.slice((last ?? range)!.index + (last ?? range)![0].length)

  const more = /(\d+|[a-zäöü]+)\s+(?:more\s+times?|weitere\s+Male?)/i.exec(rest) ?? /(?:noch|weitere)\s+(\d+|[a-zäöü]+)\s*Mal/i.exec(rest)
  if (more) return counted(span, number(more[1]!) + 1, [])
  const times = /(\d+|[a-zäöü]+)\s*(?:Mal|times)\b/i.exec(rest) ?? /\b(zweimal|dreimal|twice)\b/i.exec(rest)
  if (times) {
    const sure = /insgesamt|in total|total of/i.test(rest)
    return counted(span, number(times[1]!), sure ? [] : ['Prüfe, ob die Anzahl den ersten Durchgang einschließt.'])
  }
  const until = /\b(?:until|bis)\s+(.+?)[.\s]*$/i.exec(rest)
  if (until) return { ...span, until: { kind: 'condition', text: until[1]! }, warnings: [] }
  return null
}

function counted(span: { from?: number; to?: number; last?: number }, count: number, warnings: string[]): ParsedRepeat | null {
  return Number.isSafeInteger(count) && count >= 2 && count <= 9999
    ? { ...span, until: { kind: 'count', count }, warnings }
    : null
}

const number = (text: string) => WORDS[text.toLowerCase()] ?? Number(text)

/** „Wird wie die 1. Reihe gestrickt“ durch den Text der Reihe ersetzen. */
function resolveReferences(steps: DraftStep[], meta: Map<string, { row?: number }>) {
  steps.forEach((step, index) => {
    const match = /^([^:]{1,60}:\s*)(?:Wird\s+wie\s+(?:die\s+)?(?:(\d+)\.\s*(?:Reihe|Runde)|(?:Reihe|Runde)\s+(\d+))(?:\s+gestrickt)?|(?:Work\s+)?(?:same\s+)?as\s+(?:Row|Round)\s+(\d+))\.?$/i.exec(step.text)
    if (!match) return
    const wanted = Number(match[2] ?? match[3] ?? match[4])
    for (let i = index - 1; i >= 0; i -= 1) {
      const target = steps[i]!
      if (target.kind === 'heading') break
      if (meta.get(target.id)?.row !== wanted) continue
      step.text = match[1] + target.text.replace(/^[^:]{1,60}:\s*/, '')
      step.warnings = [...new Set([...step.warnings.filter((w) => w !== REFERENCE), ...target.warnings])]
      return
    }
  })
}

const REFERENCE = 'Verweist auf eine andere Stelle der Anleitung.'

function warningsFor(text: string, unclear: boolean, english: boolean): string[] {
  const warnings: string[] = []
  if (unclear) warnings.push('Die Zahlen passen nicht zu den erkannten Größen.')
  if (english && /\bCO\b/.test(text)) warnings.push('„CO“ kann anschlagen oder abketten heißen.')
  if (/wie oben|wie zuvor|as before|row guide|wie (?:die )?\d*\.? ?(?:Reihe|Runde)|(?:as|work) (?:row|round) \d|siehe seite/i.test(text)) warnings.push(REFERENCE)
  if (/chart|strickschrift|diagramm/i.test(text)) warnings.push('Strickschrift auf der Originalseite ansehen.')
  return warnings
}

function isEnglish(lines: Line[]): boolean {
  const words = lines.map((l) => l.text).join(' ').toLowerCase().match(/[a-zäöüß]+/g) ?? []
  const hits = (list: string[]) => words.filter((w) => list.includes(w)).length
  return hits(['the', 'and', 'of', 'to', 'knit', 'row', 'round', 'stitches', 'until']) >
    hits(['der', 'die', 'und', 'den', 'auf', 'stricke', 'reihe', 'runde', 'maschen'])
}
