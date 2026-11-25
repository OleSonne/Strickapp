export interface Step {
  id: string
  text: string
}

export type Until = { kind: 'count'; count: number } | { kind: 'condition'; text: string }

/** Zusammenhängende Schritte, die mehrfach gestrickt werden. Nie überlappend. */
export interface Repeat {
  id: string
  stepIds: string[]
  until: Until
  /** Anzahl bereits abgeschlossener Durchgänge. */
  round: number
}

/** Stand vor einer Aktion, für Rückgängig. */
export interface HistoryEntry {
  completedCount: number
  repeatId: string | null
  round: number
}

export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  /** Index des aktuellen Schritts. Gleich der Schrittanzahl, wenn alles fertig ist. */
  completedCount: number
  steps: Step[]
  repeats: Repeat[]
  history: HistoryEntry[]
}

const HISTORY_LIMIT = 500
const newId = () => crypto.randomUUID()

export function createProject(name: string, now = Date.now()): Project {
  return {
    id: newId(), name: name.trim(), createdAt: now, updatedAt: now,
    completedCount: 0, steps: [], repeats: [], history: [],
  }
}

/** Ergänzt Felder, die ältere gespeicherte Projekte (M2) noch nicht haben. */
export type StoredProject = Omit<Project, 'repeats' | 'history'> & Partial<Pick<Project, 'repeats' | 'history'>>
export const upgrade = (p: StoredProject): Project => ({
  ...p,
  repeats: p.repeats ?? [],
  history: p.history ?? [],
})

export const isFinished = (p: Project) => p.steps.length > 0 && p.completedCount === p.steps.length

export const repeatAt = (p: Project, index: number): Repeat | undefined => {
  const step = p.steps[index]
  return step && p.repeats.find((r) => r.stepIds.includes(step.id))
}

export const repeatStart = (p: Project, r: Repeat) => p.steps.findIndex((s) => s.id === r.stepIds[0])
const repeatEnd = (p: Project, r: Repeat) => repeatStart(p, r) + r.stepIds.length - 1

const setRound = (p: Project, id: string, round: number): Repeat[] =>
  p.repeats.map((r) => (r.id === id ? { ...r, round } : r))

/** Wahr, wenn am Ende eines Durchgangs gefragt werden muss, ob die Bedingung erreicht ist. */
export function needsDecision(p: Project): boolean {
  const r = repeatAt(p, p.completedCount)
  return r?.until.kind === 'condition' && p.completedCount === repeatEnd(p, r)
}

function goTo(p: Project, index: number, repeat?: Repeat, round = 0): Project {
  const entry = { completedCount: p.completedCount, repeatId: repeat?.id ?? null, round: repeat?.round ?? 0 }
  return {
    ...p,
    completedCount: index,
    repeats: repeat ? setRound(p, repeat.id, round) : p.repeats,
    history: [...p.history, entry].slice(-HISTORY_LIMIT),
  }
}

/** Schritt erledigt. Bei offener Bedingung beginnt ein weiterer Durchgang. */
export function advance(p: Project): Project {
  const index = p.completedCount
  if (index >= p.steps.length) return p
  const r = repeatAt(p, index)
  if (!r || index !== repeatEnd(p, r)) return goTo(p, index + 1)
  if (r.until.kind === 'count' && r.round + 1 >= r.until.count) return goTo(p, index + 1, r)
  return goTo(p, repeatStart(p, r), r, r.round + 1)
}

/** Die Bedingung ist erreicht, weiter nach der Wiederholung. */
export function leaveRepeat(p: Project): Project {
  const r = repeatAt(p, p.completedCount)
  return r && needsDecision(p) ? goTo(p, p.completedCount + 1, r) : p
}

export const canUndo = (p: Project) =>
  p.history.length > 0 || p.completedCount > 0 || (repeatAt(p, p.completedCount)?.round ?? 0) > 0

export function undo(p: Project): Project {
  const last = p.history.at(-1)
  if (last) {
    return {
      ...p,
      completedCount: last.completedCount,
      repeats: last.repeatId ? setRound(p, last.repeatId, last.round) : p.repeats,
      history: p.history.slice(0, -1),
    }
  }
  // Ohne Verlauf (z. B. nach Umbauten) einen Schritt zurückrechnen.
  const here = repeatAt(p, p.completedCount)
  if (here && here.round > 0 && p.completedCount === repeatStart(p, here)) {
    return { ...p, completedCount: repeatEnd(p, here), repeats: setRound(p, here.id, here.round - 1) }
  }
  if (p.completedCount === 0) return p
  const index = p.completedCount - 1
  const previous = repeatAt(p, index)
  const repeats = previous && previous.id !== here?.id && previous.until.kind === 'count'
    ? setRound(p, previous.id, previous.until.count - 1)
    : p.repeats
  return { ...p, completedCount: index, repeats }
}

/** Fortschritt samt Wiederholungen. Bedingungen zählen einfach, ihr Umfang ist unbekannt. */
export function work(p: Project): { done: number; total: number } {
  let done = 0
  let total = 0
  p.steps.forEach((_, index) => {
    const r = repeatAt(p, index)
    const times = r?.until.kind === 'count' ? r.until.count : 1
    total += times
    if (r && p.completedCount <= repeatEnd(p, r)) {
      done += Math.min((r.until.kind === 'count' ? r.round : 0) + (index < p.completedCount ? 1 : 0), times)
    } else if (index < p.completedCount) {
      done += times
    }
  })
  return { done, total }
}

/** Legt eine Wiederholung an oder ersetzt die mit `id`. */
export function saveRepeat(p: Project, from: number, to: number, until: Until, id?: string): Project {
  const stepIds = p.steps.slice(from, to + 1).map((s) => s.id)
  if (from < 0 || from > to || to >= p.steps.length) throw new Error('„Bis Schritt“ muss nach „Von Schritt“ liegen.')
  if (until.kind === 'count' && (!Number.isSafeInteger(until.count) || until.count < 2 || until.count > 9999)) {
    throw new Error('Die Anzahl muss zwischen 2 und 9999 liegen.')
  }
  if (until.kind === 'condition' && !until.text.trim()) throw new Error('Die Bedingung fehlt.')
  const others = p.repeats.filter((r) => r.id !== id)
  if (others.some((r) => r.stepIds.some((s) => stepIds.includes(s)))) {
    throw new Error('Diese Schritte gehören schon zu einer anderen Wiederholung.')
  }
  const old = p.repeats.find((r) => r.id === id)
  const round = until.kind === 'count' ? Math.min(old?.round ?? 0, until.count - 1) : (old?.round ?? 0)
  return { ...p, repeats: [...others, { id: id ?? newId(), stepIds, until, round }], history: [] }
}

export const deleteRepeat = (p: Project, id: string): Project => ({
  ...p,
  repeats: p.repeats.filter((r) => r.id !== id),
  history: [],
})

/** Eine Zeile wird ein Schritt, leere Zeilen entfallen. */
export const splitSteps = (text: string): string[] =>
  text.split(/\r?\n|\r/).map((line) => line.trim()).filter(Boolean)

export const addSteps = (p: Project, texts: string[]): Project => ({
  ...p,
  steps: [...p.steps, ...texts.map((text) => ({ id: newId(), text }))],
})

export const rename = (p: Project, name: string): Project => ({ ...p, name: name.trim() || p.name })

export const editStep = (p: Project, id: string, text: string): Project => ({
  ...p,
  steps: p.steps.map((s) => (s.id === id ? { ...s, text: text.trim() || s.text } : s)),
})

export function deleteStep(p: Project, id: string): Project {
  const repeats = p.repeats
    .map((r) => ({ ...r, stepIds: r.stepIds.filter((s) => s !== id) }))
    .filter((r) => r.stepIds.length > 0)
  return withSteps({ ...p, repeats }, p.steps.filter((s) => s.id !== id))
}

/** Liefert die neue Reihenfolge oder `null`, wenn der Schritt nicht weiter kann. */
function moved(p: Project, id: string, offset: -1 | 1): Step[] | null {
  const from = p.steps.findIndex((s) => s.id === id)
  const step = p.steps[from]
  const neighbor = p.steps[from + offset]
  if (!step || !neighbor) return null
  const own = repeatAt(p, from)
  const other = repeatAt(p, from + offset)
  // Schritte verlassen ihre Wiederholung nicht und springen über fremde ganz hinweg.
  if (own && own.id !== other?.id) return null
  const distance = !own && other ? other.stepIds.length : 1
  const steps = p.steps.filter((s) => s.id !== id)
  steps.splice(from + offset * distance, 0, step)
  return steps
}

export const canMove = (p: Project, id: string, offset: -1 | 1) => moved(p, id, offset) !== null

export function moveStep(p: Project, id: string, offset: -1 | 1): Project {
  const steps = moved(p, id, offset)
  if (!steps) return p
  const repeats = p.repeats.map((r) => ({
    ...r,
    stepIds: steps.filter((s) => r.stepIds.includes(s.id)).map((s) => s.id),
  }))
  return withSteps({ ...p, repeats }, steps)
}

/** Erledigt bleibt nur, was vor dem ersten offenen Schritt liegt: nie still überspringen. */
function withSteps(p: Project, steps: Step[]): Project {
  const done = new Set(p.steps.slice(0, p.completedCount).map((s) => s.id))
  const firstOpen = steps.findIndex((s) => !done.has(s.id))
  return { ...p, steps, completedCount: firstOpen < 0 ? steps.length : firstOpen, history: [] }
}
