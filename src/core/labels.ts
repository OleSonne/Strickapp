import { repeatAt, repeatStart, type Project, type Repeat } from './project'

export function untilLabel(r: Repeat): string {
  return r.until.kind === 'count' ? `insgesamt ${r.until.count} Mal` : `bis ${r.until.text}`
}

export function rangeLabel(p: Project, r: Repeat): string {
  const start = repeatStart(p, r) + 1
  const end = start + r.stepIds.length - 1
  return start === end ? `Schritt ${start}` : `Schritte ${start} bis ${end}`
}

/** Wo man gerade in einer Wiederholung ist, sonst `null`. */
export function roundLabel(p: Project): string | null {
  const r = repeatAt(p, p.completedCount)
  if (!r) return null
  return r.until.kind === 'count'
    ? `Durchgang ${r.round + 1} von ${r.until.count}`
    : `Durchgang ${r.round + 1}, bis: ${r.until.text}`
}
