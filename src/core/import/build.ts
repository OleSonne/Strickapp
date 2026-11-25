import { createProject, splitSteps, type Project, type Repeat, type Step, type Tip } from '../project'
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
  const tips = new Map<string, Tip[]>()
  const usable = steps.filter((s) => s.kind === 'step' && ids.has(s.id))
  for (const [index, draft] of steps.entries()) {
    if (draft.kind !== 'tip' || !draft.included || !draft.text.trim()) continue
    const target = tipTarget(steps, index, usable)
    const targetId = target && ids.get(target.id)?.at(-1)
    if (!target || !targetId) continue
    const repeat = repeats.find((r) => r.stepIds.includes(target.id))
    // Steht der Tipp hinter der Wiederholung, gilt er erst nach dem letzten Durchgang.
    const last = repeat && steps.findIndex((s) => s.id === repeat.stepIds.at(-1))
    const after = last !== undefined && index > last && draft.attachTo === undefined
    const tip: Tip = { text: draft.text.trim(), ...(after && { after: true }) }
    tips.set(targetId, [...(tips.get(targetId) ?? []), tip])
  }
  for (const step of result) {
    const own = tips.get(step.id)
    if (own) step.tips = own
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

/** Voriger Schritt im selben Abschnitt, sonst der nächste. */
export function tipTarget(steps: DraftStep[], index: number, usable: DraftStep[]): DraftStep | undefined {
  const tip = steps[index]!
  const fixed = usable.find((s) => s.id === tip.attachTo)
  if (fixed) return fixed
  const position = new Map(steps.map((s, i) => [s.id, i]))
  const before = usable.filter((s) => position.get(s.id)! < index).at(-1)
  const after = usable.find((s) => position.get(s.id)! > index)
  return before?.section === tip.section || !after ? before : after
}
