import { createProject, splitSteps, type Project, type Repeat, type Step } from '../project'
import type { DraftRepeat, DraftStep } from './parse'

/** Erstellt das Projekt aus den geprüften Schritten. */
export function buildProject(name: string, steps: DraftStep[], repeats: DraftRepeat[]): Project {
  const result: Step[] = []
  const ids = new Map<string, string[]>()
  for (const draft of steps) {
    if (draft.kind !== 'step' || !draft.included) continue
    for (const text of splitSteps(draft.text)) {
      const step: Step = { id: crypto.randomUUID(), text }
      if (draft.section) step.section = draft.section
      if (draft.page > 0) step.page = draft.page
      if (draft.original !== text) step.original = draft.original
      if (draft.warnings.length) step.note = draft.warnings.join(' ')
      result.push(step)
      ids.set(draft.id, [...(ids.get(draft.id) ?? []), step.id])
    }
  }
  const kept: Repeat[] = []
  for (const r of repeats) {
    const stepIds = r.stepIds.flatMap((id) => ids.get(id) ?? [])
    const start = result.findIndex((s) => s.id === stepIds[0])
    // Nur zusammenhängende Schritte lassen sich wiederholen.
    if (start < 0 || !stepIds.every((id, i) => result[start + i]?.id === id)) continue
    kept.push({ id: crypto.randomUUID(), stepIds, until: r.until, round: 0 })
  }
  return { ...createProject(name), steps: result, repeats: kept }
}
