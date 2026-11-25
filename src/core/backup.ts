import { upgrade, type Chart, type HistoryEntry, type Project, type Repeat, type Step, type Tip, type Until } from './project'

export const toBackup = (projects: Project[]) =>
  JSON.stringify({ app: 'strickapp', version: 2, projects }, null, 2)

/** Prüft die Datei vollständig, damit nichts Beschädigtes gespeichert wird. */
export function parseBackup(text: string): Project[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Die Datei ist keine gültige Sicherung.')
  }
  if (!isRecord(data) || data.app !== 'strickapp' || (data.version !== 1 && data.version !== 2) || !Array.isArray(data.projects)) {
    throw new Error('Die Datei ist keine gültige Sicherung.')
  }
  return data.projects.map(parseProject)
}

function parseProject(value: unknown): Project {
  if (
    isRecord(value) &&
    isText(value.id) &&
    isText(value.name) &&
    isCount(value.createdAt) &&
    isCount(value.updatedAt) &&
    isCount(value.completedCount) &&
    Array.isArray(value.steps) &&
    value.steps.every(isStep) &&
    value.completedCount <= value.steps.length
  ) {
    const { id, name, createdAt, updatedAt, completedCount } = value
    const steps = value.steps.map(copyStep)
    if (new Set(steps.map((s) => s.id)).size === steps.length) {
      const base = { id, name, createdAt, updatedAt, completedCount, steps }
      if (value.repeats === undefined && value.history === undefined) return upgrade(base)
      const { repeats, history } = value
      const charts = value.charts ?? []
      if (
        Array.isArray(charts) && charts.every(isChart) &&
        steps.every((s) => !s.chart || charts.some((c) => c.id === s.chart!.id && s.chart!.row <= c.rows)) &&
        Array.isArray(repeats) && repeats.every(isRepeat) && fit(repeats, steps) &&
        Array.isArray(history) && history.every((h) => isEntry(h, steps.length, repeats))
      ) {
        return { ...base, repeats, history, charts }
      }
    }
  }
  throw new Error('Die Sicherung enthält ein beschädigtes Projekt.')
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isCount = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0
const optional = (v: unknown, check: (v: unknown) => boolean) => v === undefined || check(v)
const isStep = (v: unknown): v is Step =>
  isRecord(v) && isText(v.id) && isText(v.text) && optional(v.section, isText) && optional(v.page, isCount) &&
  optional(v.original, isText) && optional(v.note, isText) &&
  optional(v.tips, (t) => Array.isArray(t) && t.every(isTip)) &&
  optional(v.chart, (c) => isRecord(c) && isText(c.id) && isCount(c.row) && c.row >= 1)

const isTip = (v: unknown): v is Tip => isRecord(v) && isText(v.text) && optional(v.after, (a) => typeof a === 'boolean')
const isShare = (v: unknown) => typeof v === 'number' && v >= 0 && v <= 1
const isChart = (v: unknown): v is Chart =>
  isRecord(v) && isText(v.id) && isCount(v.page) && v.page >= 1 && [v.x, v.y, v.w, v.h].every(isShare) &&
  isCount(v.rows) && v.rows >= 1 && v.rows <= 300 && isCount(v.stitches) && v.stitches >= 1 && v.stitches <= 500 &&
  typeof v.inRounds === 'boolean' && hasColors(v)

function hasColors(v: Record<string, unknown>): boolean {
  const { colors, cells, rows, stitches } = v
  if (colors === undefined && cells === undefined) return true
  return (
    Array.isArray(colors) && Array.isArray(cells) && cells.length === rows &&
    colors.every((c) => isRecord(c) && isText(c.name) && typeof c.hex === 'string' && /^#[0-9a-f]{6}$/.test(c.hex)) &&
    cells.every((line) => Array.isArray(line) && line.length === stitches &&
      line.every((c) => isCount(c) && c < colors.length))
  )
}

function copyStep({ id, text, section, page, original, note, tips, chart }: Step): Step {
  return {
    id, text,
    ...(section !== undefined && { section }),
    ...(page !== undefined && { page }),
    ...(original !== undefined && { original }),
    ...(note !== undefined && { note }),
    ...(tips !== undefined && { tips }),
    ...(chart !== undefined && { chart }),
  }
}


const isUntil = (v: unknown): v is Until =>
  isRecord(v) &&
  ((v.kind === 'count' && isCount(v.count) && v.count >= 2 && v.count <= 9999) ||
    (v.kind === 'condition' && isText(v.text)))
const isRepeat = (v: unknown): v is Repeat =>
  isRecord(v) && isText(v.id) && Array.isArray(v.stepIds) && v.stepIds.length > 0 && v.stepIds.every(isText) &&
  isUntil(v.until) && isCount(v.round) && (v.until.kind === 'condition' || v.round < v.until.count)
const isEntry = (v: unknown, stepCount: number, repeats: Repeat[]): v is HistoryEntry =>
  isRecord(v) && isCount(v.completedCount) && v.completedCount <= stepCount && isCount(v.round) &&
  (v.repeatId === null || repeats.some((r) => r.id === v.repeatId &&
    (r.until.kind === 'condition' || (v.round as number) < r.until.count)))

/** Wiederholungen müssen zusammenhängen und dürfen sich nicht überlappen. */
function fit(repeats: Repeat[], steps: Step[]): boolean {
  const used = repeats.flatMap((r) => r.stepIds)
  return (
    new Set(used).size === used.length &&
    new Set(repeats.map((r) => r.id)).size === repeats.length &&
    repeats.every((r) => {
      const start = steps.findIndex((s) => s.id === r.stepIds[0])
      return start >= 0 && r.stepIds.every((id, i) => steps[start + i]?.id === id)
    })
  )
}
