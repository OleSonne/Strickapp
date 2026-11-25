import type { Project, Step } from './project'

export const toBackup = (projects: Project[]) =>
  JSON.stringify({ app: 'strickapp', version: 1, projects }, null, 2)

/** Prüft die Datei vollständig, damit nichts Beschädigtes gespeichert wird. */
export function parseBackup(text: string): Project[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Die Datei ist keine gültige Sicherung.')
  }
  if (!isRecord(data) || data.app !== 'strickapp' || data.version !== 1 || !Array.isArray(data.projects)) {
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
    const steps = value.steps.map((s: Step) => ({ id: s.id, text: s.text }))
    if (new Set(steps.map((s) => s.id)).size === steps.length) {
      return { id, name, createdAt, updatedAt, completedCount, steps }
    }
  }
  throw new Error('Die Sicherung enthält ein beschädigtes Projekt.')
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isCount = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0
const isStep = (v: unknown): v is Step => isRecord(v) && isText(v.id) && isText(v.text)
