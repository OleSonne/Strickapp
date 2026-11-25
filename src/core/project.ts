export interface Step {
  id: string
  text: string
}

export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  /** Anzahl erledigter Schritte, zugleich Index des aktuellen Schritts. */
  completedCount: number
  steps: Step[]
}

const newId = () => crypto.randomUUID()
const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max)

export function createProject(name: string, now = Date.now()): Project {
  return { id: newId(), name: name.trim(), createdAt: now, updatedAt: now, completedCount: 0, steps: [] }
}

export const isFinished = (p: Project) => p.steps.length > 0 && p.completedCount === p.steps.length

export const advance = (p: Project): Project => ({
  ...p,
  completedCount: clamp(p.completedCount + 1, p.steps.length),
})

export const goBack = (p: Project): Project => ({
  ...p,
  completedCount: clamp(p.completedCount - 1, p.steps.length),
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

export const deleteStep = (p: Project, id: string): Project =>
  withSteps(p, p.steps.filter((s) => s.id !== id))

export function moveStep(p: Project, id: string, offset: -1 | 1): Project {
  const from = p.steps.findIndex((s) => s.id === id)
  const to = from + offset
  const a = p.steps[from]
  const b = p.steps[to]
  if (!a || !b) return p
  const steps = [...p.steps]
  steps[from] = b
  steps[to] = a
  return withSteps(p, steps)
}

/** Erledigt bleibt nur, was vor dem ersten offenen Schritt liegt: nie still überspringen. */
function withSteps(p: Project, steps: Step[]): Project {
  const done = new Set(p.steps.slice(0, p.completedCount).map((s) => s.id))
  const firstOpen = steps.findIndex((s) => !done.has(s.id))
  return { ...p, steps, completedCount: firstOpen < 0 ? steps.length : firstOpen }
}
