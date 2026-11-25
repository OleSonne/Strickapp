import { describe, expect, it } from 'vitest'
import { parseBackup, toBackup } from './backup'
import { addSteps, advance, createProject, deleteStep, editStep, goBack, isFinished, moveStep, splitSteps } from './project'

function sample(completed = 0) {
  const p = addSteps(createProject('Schal', 1), ['a', 'b', 'c'])
  return { ...p, completedCount: completed }
}
const id = (p: ReturnType<typeof sample>, i: number) => p.steps[i]!.id
const current = (p: ReturnType<typeof sample>) => p.steps[p.completedCount]?.text

describe('Fortschritt', () => {
  it('bleibt im gültigen Bereich', () => {
    expect(goBack(sample()).completedCount).toBe(0)
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
  it.each(['', '[]', '{"app":"strickapp","version":2,"projects":[]}'])('lehnt fremde Daten ab: %s', (text) => {
    expect(() => parseBackup(text)).toThrow('keine gültige Sicherung')
  })
  it('lehnt beschädigte Projekte ab', () => {
    expect(() => parseBackup(toBackup([sample(9)]))).toThrow('beschädigt')
  })
})
