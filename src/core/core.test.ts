import { addChart, chartRow, deleteChart } from './project'
import { describe, expect, it } from 'vitest'
import { parseBackup, toBackup } from './backup'
import { addSteps, advance, canMove, canUndo, createProject, deleteRepeat, deleteStep, editStep, isFinished, leaveRepeat,
  moveStep, needsDecision, saveRepeat, splitSteps, undo, upgrade, work, type Project } from './project'

function sample(completed = 0) {
  const p = addSteps(createProject('Schal', 1), ['a', 'b', 'c'])
  return { ...p, completedCount: completed }
}
const id = (p: ReturnType<typeof sample>, i: number) => p.steps[i]!.id
const current = (p: ReturnType<typeof sample>) => p.steps[p.completedCount]?.text

describe('Fortschritt', () => {
  it('bleibt im gültigen Bereich', () => {
    expect(undo(sample()).completedCount).toBe(0)
    expect(advance(sample(3)).completedCount).toBe(3)
    expect(advance(createProject('leer')).completedCount).toBe(0)
  })
  it('erkennt fertige, aber nicht leere Projekte', () => {
    expect(isFinished(advance(sample(2)))).toBe(true)
    expect(isFinished(createProject('leer'))).toBe(false)
  })
  it('setzt fertige Projekte mit neuen Schritten fort', () => {
    expect(current(addSteps(sample(3), ['d']))).toBe('d')
  })
})

describe('Schritte ändern', () => {
  it('behält den aktuellen Schritt beim Löschen eines früheren', () => {
    const p = sample(1)
    expect(current(deleteStep(p, id(p, 0)))).toBe('b')
  })
  it('rückt nach, wenn der aktuelle gelöscht wird', () => {
    const p = sample(1)
    expect(current(deleteStep(p, id(p, 1)))).toBe('c')
  })
  it('ist fertig, wenn der letzte offene gelöscht wird', () => {
    const p = sample(2)
    expect(isFinished(deleteStep(p, id(p, 2)))).toBe(true)
  })
  it('folgt dem aktuellen Schritt beim Verschieben', () => {
    const p = sample(1)
    expect(current(moveStep(p, id(p, 1), -1))).toBe('b')
  })
  it('gilt beim Vorziehen eines offenen Schritts nicht als erledigt', () => {
    const p = sample(1)
    const moved = moveStep(p, id(p, 2), -1)
    expect(current(moved)).toBe('c')
    expect(moved.completedCount).toBe(1)
  })
  it('ignoriert Verschieben über den Rand', () => {
    const p = sample()
    expect(moveStep(p, id(p, 0), -1)).toBe(p)
    expect(moveStep(p, id(p, 2), 1)).toBe(p)
  })
  it('verwirft leeren Text', () => {
    const p = sample()
    expect(editStep(p, id(p, 0), '  ').steps[0]!.text).toBe('a')
  })
  it('teilt Text in Zeilen', () => {
    expect(splitSteps(' 6 M anschlagen \r\n\n  \n1 R rechts\n')).toEqual(['6 M anschlagen', '1 R rechts'])
  })
})

describe('Sicherung', () => {
  it('übersteht Sichern und Lesen', () => {
    const p = sample(2)
    expect(parseBackup(toBackup([p]))).toEqual([p])
  })
  it.each(['', '[]', '{"app":"strickapp","version":3,"projects":[]}'])('lehnt fremde Daten ab: %s', (text) => {
    expect(() => parseBackup(text)).toThrow('keine gültige Sicherung')
  })
  it('lehnt beschädigte Projekte ab', () => {
    expect(() => parseBackup(toBackup([sample(9)]))).toThrow('beschädigt')
  })
})

describe('Wiederholungen', () => {
  // a, dann b und c insgesamt 3 Mal, dann d
  const counted = () => {
    const p = addSteps(createProject('Schal', 1), ['a', 'b', 'c', 'd'])
    return saveRepeat(p, 1, 2, { kind: 'count', count: 3 })
  }
  const conditional = () => {
    const p = addSteps(createProject('Schal', 1), ['a', 'b', 'c'])
    return saveRepeat(p, 0, 1, { kind: 'condition', text: '20 cm' })
  }
  const times = (p: Project, n: number, f: (p: Project) => Project) => {
    for (let i = 0; i < n; i += 1) p = f(p)
    return p
  }
  const walk = (p: Project) => {
    const seen: (string | undefined)[] = []
    while (!isFinished(p)) {
      seen.push(p.steps[p.completedCount]?.text)
      p = advance(p)
    }
    return seen.join('')
  }

  it('strickt die feste Anzahl', () => {
    expect(walk(counted())).toBe('abcbcbcd')
  })
  it('wiederholt einen einzelnen Schritt', () => {
    const p = addSteps(createProject('x'), ['a', 'b'])
    expect(walk(saveRepeat(p, 0, 0, { kind: 'count', count: 4 }))).toBe('aaaab')
  })
  it('fragt bei einer Bedingung am Ende jedes Durchgangs', () => {
    let p = conditional()
    expect(needsDecision(p)).toBe(false)
    expect(leaveRepeat(p)).toBe(p)
    p = advance(p)
    expect(needsDecision(p)).toBe(true)
    p = advance(p)
    expect([p.completedCount, p.repeats[0]!.round]).toEqual([0, 1])
    p = leaveRepeat(advance(p))
    expect([p.completedCount, p.repeats[0]!.round]).toEqual([2, 0])
  })
  it('macht jede Aktion genau rückgängig', () => {
    const start = counted()
    for (let n = 1; n <= 8; n += 1) {
      const before = times(start, n - 1, advance)
      expect(undo(advance(before))).toEqual(before)
    }
    const open = advance(times(conditional(), 3, advance))
    expect(undo(leaveRepeat(advance(open)))).toEqual(advance(open))
  })
  it('rechnet auch ohne Verlauf zurück', () => {
    let p: Project = { ...times(counted(), 8, advance), history: [] }
    let seen = ''
    while (canUndo(p)) {
      p = undo(p)
      seen += p.steps[p.completedCount]!.text
    }
    expect(seen).toBe('dcbcbcba')
  })
  it('zählt den Fortschritt lückenlos', () => {
    const values = Array.from({ length: 9 }, (_, n) => work(times(counted(), n, advance)))
    expect(values.map((v) => v.done)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(values[0]!.total).toBe(8)
  })
  it('lehnt ungültige und überlappende Wiederholungen ab', () => {
    const p = counted()
    expect(() => saveRepeat(p, 2, 3, { kind: 'count', count: 2 })).toThrow('anderen Wiederholung')
    expect(() => saveRepeat(p, 3, 0, { kind: 'count', count: 2 })).toThrow('Bis Schritt')
    expect(() => saveRepeat(p, 3, 3, { kind: 'count', count: 1 })).toThrow('Anzahl')
    expect(() => saveRepeat(p, 3, 3, { kind: 'count', count: NaN })).toThrow('Anzahl')
    expect(() => saveRepeat(p, 3, 3, { kind: 'condition', text: ' ' })).toThrow('Bedingung')
  })
  it('begrenzt den Durchgang, wenn die Anzahl sinkt', () => {
    const p = times(counted(), 5, advance)
    expect(p.repeats[0]!.round).toBe(2)
    expect(saveRepeat(p, 1, 2, { kind: 'count', count: 2 }, p.repeats[0]!.id).repeats[0]!.round).toBe(1)
  })
  it('hält Wiederholungen beim Verschieben zusammen', () => {
    const p = counted()
    const ids = p.steps.map((s) => s.id)
    const jumped = moveStep(p, ids[3]!, -1)
    expect(walk(jumped)).toBe('adbcbcbc')
    expect(canMove(p, ids[1]!, -1)).toBe(false)
    expect(walk(moveStep(p, ids[1]!, 1))).toBe('acbcbcbd')
    expect(walk(moveStep(p, ids[0]!, 1))).toBe('bcbcbcad')
  })
  it('behält den Durchgang beim Löschen eines anderen Schritts', () => {
    const p = times(counted(), 4, advance)
    const q = deleteStep(p, p.steps[0]!.id)
    expect([current(q), q.repeats[0]!.round]).toEqual(['c', 1])
  })
  it('entfernt leere Wiederholungen', () => {
    let p = counted()
    p = deleteStep(p, p.steps[1]!.id)
    expect(walk(p)).toBe('acccd')
    p = deleteStep(p, p.steps[1]!.id)
    expect(p.repeats).toEqual([])
    expect(deleteRepeat(counted(), counted().repeats[0]!.id).repeats).toHaveLength(1)
  })
  it('übersteht die Sicherung und lehnt kaputte Wiederholungen ab', () => {
    const p = times(counted(), 4, advance)
    expect(parseBackup(toBackup([p]))).toEqual([p])
    const broken = { ...p, repeats: [{ ...p.repeats[0]!, round: 3 }] }
    expect(() => parseBackup(toBackup([broken]))).toThrow('beschädigt')
  })
  it('übernimmt Projekte und Sicherungen aus M2', () => {
    const { repeats: _r, history: _h, charts: _c, ...old } = sample(1)
    expect(upgrade(old)).toEqual(withDefaults(old))
    const text = JSON.stringify({ app: 'strickapp', version: 1, projects: [old] })
    expect(parseBackup(text)).toEqual([upgrade(old)])
  })
})

const withDefaults = (old: object) => ({ ...old, repeats: [], history: [], charts: [] })

describe('Strickschrift', () => {
  const data = { page: 2, x: 0.1, y: 0.2, w: 0.5, h: 0.5, rows: 3, stitches: 8, inRounds: false }
  const withChart = (completed = 0) => {
    const p = sample(completed)
    return addChart(p, id(p, 1), data)
  }
  it('fügt jede Reihe als Schritt ein', () => {
    expect(withChart().steps.map((s) => s.chart?.row ?? s.text)).toEqual(['a', 'b', 1, 2, 3, 'c'])
  })
  it('überspringt neue Reihen nicht, wenn man schon weiter ist', () => {
    expect(withChart(3).completedCount).toBe(2)
  })
  it('liest Reihe 1 unten und wechselt in Reihen die Richtung', () => {
    const chart = withChart().charts[0]!
    expect(chartRow(chart, 1).top).toBeCloseTo(2 / 3)
    expect(chartRow(chart, 3).top).toBeCloseTo(0)
    expect([1, 2, 3].map((r) => chartRow(chart, r).fromRight)).toEqual([true, false, true])
    expect(chartRow({ ...chart, inRounds: true }, 2).fromRight).toBe(true)
  })
  it('gehört zur Wiederholung des Schritts', () => {
    const p = sample()
    const r = saveRepeat(p, 0, 1, { kind: 'count', count: 2 })
    expect(addChart(r, id(r, 0), data).repeats[0]!.stepIds).toHaveLength(5)
  })
  it('lässt sich wieder entfernen', () => {
    const p = withChart()
    const q = deleteChart(p, p.charts[0]!.id)
    expect([q.steps.length, q.charts.length]).toEqual([3, 0])
  })
  it('lehnt ungültige Angaben ab', () => {
    const p = sample()
    expect(() => addChart(p, id(p, 0), { ...data, rows: 0 })).toThrow('Reihenzahl')
    expect(() => addChart(p, id(p, 0), { ...data, stitches: NaN })).toThrow('Maschenzahl')
    expect(() => addChart(p, id(p, 0), { ...data, w: 0 })).toThrow('Markiere')
  })
  it('übersteht die Sicherung', () => {
    const p = withChart()
    expect(parseBackup(toBackup([p]))).toEqual([p])
    expect(() => parseBackup(toBackup([{ ...p, charts: [] }]))).toThrow('beschädigt')
  })
})
