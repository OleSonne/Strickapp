import { describe, expect, it } from 'vitest'
import { advance } from '../project'
import { buildProject } from './build'
import { textToLines, toLines, type TextItem } from './lines'
import { analyze, parsePattern, parseRepeat, splitSentences, type Choices } from './parse'
import { countSizes, pickSize, sizeNames } from './sizes'

// Alle Anleitungen hier sind selbst geschrieben.
const none: Choices = { size: 0, variants: {} }
const parse = (text: string, choices = none) => parsePattern(textToLines(text), choices)
const included = (text: string, choices = none) =>
  parse(text, choices).steps.filter((s) => s.kind === 'step' && s.included).map((s) => s.text)

const item = (str: string, x: number, y: number, extra: Partial<TextItem> = {}): TextItem => ({
  str, x, y, w: str.length * 5, size: 10, page: 1, font: 'body', ...extra,
})

describe('Größen', () => {
  it('erkennt die Anzahl', () => {
    expect(countSizes(['10 (12) M', '20 (24) R'])).toBe(2)
    expect(countSizes(['10 (12) 14 M', '20 (24) 28 R'])).toBe(3)
    expect(countSizes(['1 (2) 3 (4) M, 5 (6) 7 (8) R'])).toBe(4)
    expect(countSizes(['10 Maschen (2 mehr)', '4 mm (60 cm)'])).toBe(1)
  })
  it('setzt den gewählten Wert ein', () => {
    expect(pickSize('Stricke 10 (12) 14 M', 3, 2).text).toBe('Stricke 14 M')
    expect(pickSize('Row 11 (13) 15 (RS): knit', 3, 1).text).toBe('Row 13 (RS): knit')
    expect(pickSize('3,5 (4,5) cm', 2, 1).text).toBe('4,5 cm')
  })
  it('lässt andere Klammern in Ruhe', () => {
    expect(pickSize('4 mm (60 cm), 8 M (alle Größen)', 2, 0)).toEqual({ text: '4 mm (60 cm), 8 M (alle Größen)', unclear: false })
  })
  it('markiert unpassende Zahlenfolgen', () => {
    expect(pickSize('10 (12) M', 3, 0)).toEqual({ text: '10 (12) M', unclear: true })
  })
  it('liest Namen der Größen', () => {
    expect(sizeNames(['Größen: S (M) L'], 3)).toEqual(['S', 'M', 'L'])
    expect(sizeNames([], 2)).toEqual(['Größe 1', 'Größe 2'])
  })
})

describe('Sätze', () => {
  it('trennt nicht nach Abkürzungen und Ordnungszahlen', () => {
    expect(splitSentences('Stricke bis zur 8. Reihe. Das sind ca. 4 cm. Nun wenden.')).toEqual([
      'Stricke bis zur 8. Reihe.', 'Das sind ca. 4 cm.', 'Nun wenden.',
    ])
    expect(splitSentences('Stricke die 1.-7. Reihe noch einmal.')).toHaveLength(1)
  })
})

describe('Wiederholungen', () => {
  it.each([
    ['Stricke diese 8 Reihen insgesamt 5 Mal.', { last: 8, until: { kind: 'count', count: 5 } }],
    ['Stricke Reihen 1 und 2 insgesamt drei Mal.', { from: 1, to: 2, until: { kind: 'count', count: 3 } }],
    ['Rep Rows 3 - 6; 1 more time', { from: 3, to: 6, until: { kind: 'count', count: 2 } }],
    ['Wiederhole Reihe 1-2 noch 4 Mal.', { from: 1, to: 2, until: { kind: 'count', count: 5 } }],
    ['Repeat rounds 1-2 until 16 sts remain.', { from: 1, to: 2, until: { kind: 'condition', text: '16 sts remain' } }],
  ])('%s', (text, expected) => {
    expect(parseRepeat(text)).toMatchObject(expected)
    expect(parseRepeat(text)!.warnings).toEqual([])
  })
  it('weist auf unklare Anzahl hin', () => {
    expect(parseRepeat('Stricke Reihe 1-4 zwei Mal.')!.warnings).toHaveLength(1)
  })
  it('lehnt Unsinn ab', () => {
    expect(parseRepeat('Stricke Reihe 1-2 blau Mal.')).toBeNull()
    expect(parseRepeat('Stricke Reihe 4-2 drei Mal.')).toBeNull()
  })
})

const SCARF = `Größen: klein (groß)

Material:
Garn 50 (80) g

ANLEITUNG

Schlage 6 (8) M an. Verteile sie gleichmäßig.

Reihe 1 (Rück-R): Stricke alle M li.
Reihe 2 (Hin-R): 2 re, 1 M zunehmen, re bis zum Ende.
Reihe 3: Wird wie die 1. Reihe gestrickt.
Stricke Reihe 1-3 insgesamt 4 (5) Mal. Nun liegen 10 (13) M auf der Nadel.

Kette alle M ab.`

describe('Anleitung', () => {
  it('liefert Schritte der gewählten Größe', () => {
    expect(analyze(textToLines(SCARF)).sizeNames).toEqual(['klein', 'groß'])
    expect(included(SCARF, { size: 1, variants: {} })).toEqual([
      'Schlage 8 M an.', 'Verteile sie gleichmäßig.', 'Reihe 1 (Rück-R): Stricke alle M li.',
      'Reihe 2 (Hin-R): 2 re, 1 M zunehmen, re bis zum Ende.', 'Reihe 3: Stricke alle M li.',
      'Kette alle M ab.',
    ])
    expect(parse(SCARF).steps.filter((x) => x.kind === 'tip').map((x) => x.text)).toEqual(['Nun liegen 10 M auf der Nadel.'])
  })
  it('behält den Wortlaut und erkennt die Wiederholung', () => {
    const draft = parse(SCARF, { size: 1, variants: {} })
    expect(draft.steps.find((s) => s.text.startsWith('Reihe 3'))!.original).toContain('wie die 1. Reihe')
    expect(draft.repeats).toHaveLength(1)
    expect(draft.repeats[0]!.stepIds).toHaveLength(3)
    expect(draft.repeats[0]!.until).toEqual({ kind: 'count', count: 5 })
  })
  it('verliert keinen Text', () => {
    const draft = parse(SCARF)
    const all = [...draft.steps, ...draft.repeats].map((s) => s.original).join(' ').replace(/\s+/g, ' ')
    for (const part of SCARF.split('\n').flatMap(splitSentences)) expect(all).toContain(part)
  })
  it('baut ein strickbares Projekt', () => {
    const draft = parse(SCARF, { size: 1, variants: {} })
    let p = buildProject('Schal', draft.steps, draft.repeats)
    let taps = 0
    while (p.completedCount < p.steps.length) {
      p = advance(p)
      taps += 1
    }
    expect(taps).toBe(2 + 3 * 5 + 1)
  })
  it('lässt eine Wiederholung weg, wenn sie nicht mehr zusammenhängt', () => {
    const draft = parse(SCARF)
    const inside = draft.repeats[0]!.stepIds
    const kept = draft.steps.map((s) => (s.id === inside[1] ? { ...s, included: false } : s))
    expect(buildProject('x', kept, draft.repeats).repeats[0]!.stepIds).toHaveLength(2)
  })
  it('zerlegt Reihenbereiche', () => {
    expect(included('Rounds 2-4: knit all.')).toEqual(['Rounds 2: knit all.', 'Rounds 3: knit all.', 'Rounds 4: knit all.'].map((t) => t.replace('Rounds', 'Round')))
  })
  it('nimmt Text zwischen Reihen in die Wiederholung auf', () => {
    const draft = parse('Round 1: [k1, p1\n\nuntil marker.]\n\nRepeat [] to end.\n\nRound 2: knit all.\n\nRepeat rounds 1-2 until 8 sts remain.')
    expect(draft.repeats[0]!.stepIds).toHaveLength(3)
  })
  it('meldet nicht zuordenbare Wiederholungen', () => {
    const draft = parse('Reihe 1: re.\n\nStricke Reihe 5-6 insgesamt 2 Mal.')
    expect(draft.repeats).toEqual([])
    expect(draft.steps.at(-1)!.warnings).toHaveLength(1)
  })
  it('weist auf mehrdeutiges CO und Strickschriften hin', () => {
    const draft = parse('Row 1: knit all the sts to the end.\n\nThen CO all sts.\n\nFollow the chart.')
    expect(draft.english).toBe(true)
    expect(draft.steps[1]!.warnings[0]).toContain('CO')
    expect(draft.steps[2]!.warnings[0]).toContain('Strickschrift')
  })
  it('schaltet nummerierte Reihen nach einem Hinweis wieder ein', () => {
    expect(included('ANLEITUNG\n\nHinweise:\nGut zu wissen.\n\nReihe 1: alle M re.\nReihe 2: alle M li.')).toEqual([
      'Reihe 1: alle M re.', 'Reihe 2: alle M li.',
    ])
  })
  it('behält Anweisungen nach einer Wiederholung', () => {
    const draft = parse('Row 1: knit.\n\nRow 2: purl.\n\nRep Rows 1 - 2; 3 more times, then bind off all sts.')
    expect(draft.repeats[0]!.until).toEqual({ kind: 'count', count: 4 })
    expect(draft.steps.at(-1)!.text).toBe('then bind off all sts.')
  })
  it('wiederholt Reihen bis zur angekündigten Gesamtzahl', () => {
    const draft = parse('Stricke 12 Reihen glatt rechts:\n\nReihe 1: li.\nReihe 2: re.\n\nKette ab.')
    expect(draft.repeats[0]).toMatchObject({ stepIds: [draft.steps[1]!.id, draft.steps[2]!.id], until: { kind: 'count', count: 6 } })
    expect(draft.repeats[0]!.warnings).toHaveLength(1)
  })
  it('warnt, wenn die Gesamtzahl nicht aufgeht', () => {
    const draft = parse('Stricke 5 Reihen:\n\nReihe 1: li.\nReihe 2: re.')
    expect(draft.repeats).toEqual([])
    expect(draft.steps[0]!.warnings).toHaveLength(1)
  })
  it('warnt bei freien Wiederholungen', () => {
    expect(parse('Rep for the second sleeve.').steps[0]!.warnings).toHaveLength(1)
  })
  it('übersteht leeren Text', () => {
    expect(parse('').steps).toEqual([])
    expect(toLines([])).toEqual([])
  })
})

describe('Tipps', () => {
  const build = (text: string) => {
    const d = parse(text)
    return buildProject('x', d.steps, d.repeats)
  }
  it('hängt Tipps und Kontrollen an den vorigen Schritt', () => {
    const p = build('Schlage 8 M an.\n\nTIPP: Nicht zu fest anschlagen. Das hilft später.\n\nEs sollten 8 M auf der Nadel liegen.\n\nKette ab.')
    expect(p.steps.map((s) => s.text)).toEqual(['Schlage 8 M an.', 'Kette ab.'])
    expect(p.steps[0]!.tips!.map((t) => t.text)).toEqual([
      'TIPP: Nicht zu fest anschlagen. Das hilft später.', 'Es sollten 8 M auf der Nadel liegen.',
    ])
  })
  it('behandelt ganze Klammersätze als Tipp', () => {
    const p = build('Cast on 8 sts. (If you like, use 10. That works too.) Knit all.')
    expect(p.steps.map((s) => s.text)).toEqual(['Cast on 8 sts.', 'Knit all.'])
    expect(p.steps[0]!.tips).toEqual([{ text: '(If you like, use 10. That works too.)' }])
  })
  it('nimmt einen Tipp am Abschnittsanfang zum nächsten Schritt', () => {
    expect(build('FERSE\n\nTIPP: Locker bleiben.\n\nSchlage 8 M an.').steps[0]!.tips).toHaveLength(1)
  })
  it('kennzeichnet Kontrollen nach einer Wiederholung', () => {
    const d = parse(SCARF)
    const p = buildProject('x', d.steps, d.repeats)
    expect(p.steps.find((s) => s.tips)!.tips).toEqual([{ text: 'Nun liegen 10 M auf der Nadel.', after: true }])
  })
  it('behält Anweisungen als Schritte', () => {
    expect(included('Nun strickst du 4 Reihen.\n\nJetzt werden 2 M abgenommen.\n\nWiederhole das (siehe oben).')).toHaveLength(3)
  })
  it('löst kleine Kästen aus dem Text, auch wenn sie nicht auf Zeilenhöhe stehen', () => {
    const lines = toLines([
      item('Stricke glatt rechts wie folgt:', 10, 20),
      item('Reihe 1: alle M li, und so weiter.', 10, 48), item('Reihe 2: alle M re.', 10, 62), item('Reihe 3: alle M li.', 10, 76),
      item('TIPP: Das', 300, 40, { size: 9 }), item('Video', 305, 50, { size: 9, font: 'bold' }), item('hilft dir.', 300, 60, { size: 9 }),
    ])
    const d = parsePattern(lines, none)
    const p = buildProject('x', d.steps, d.repeats)
    expect(p.steps.map((s) => s.text)).toEqual([
      'Stricke glatt rechts wie folgt:', 'Reihe 1: alle M li, und so weiter.', 'Reihe 2: alle M re.', 'Reihe 3: alle M li.',
    ])
    expect(p.steps[0]!.tips).toEqual([{ text: 'TIPP: Das Video hilft dir.' }])
  })
  it('hängt einen Kasten am Rand an den Schritt daneben', () => {
    const lines = toLines([
      item('Stricke wie folgt:', 10, 20), item('TIPP: Ein', 300, 20),
      item('Reihe 1: alle M li.', 10, 34), item('Video', 300, 34, { font: 'bold' }),
      item('Reihe 2: alle M re.', 10, 48), item('hilft dir.', 300, 48),
    ])
    const d = parsePattern(lines, none)
    const p = buildProject('x', d.steps, d.repeats)
    expect(p.steps.map((s) => s.text)).toEqual(['Stricke wie folgt:', 'Reihe 1: alle M li.', 'Reihe 2: alle M re.'])
    expect(p.steps[0]!.tips).toEqual([{ text: 'TIPP: Ein Video hilft dir.' }])
  })
})

describe('PDF-Layout', () => {
  it('liest Spalten nacheinander und bietet Varianten an', () => {
    const lines = toLines([
      item('Linker Fuß:', 10, 20), item('Rechter Fuß:', 300, 20),
      item('Reihe 1: alle M li.', 10, 35), item('Reihe 1: alle M re.', 300, 35),
    ])
    expect(lines.map((l) => l.text)).toEqual(['Linker Fuß:', 'Reihe 1: alle M li.', 'Rechter Fuß:', 'Reihe 1: alle M re.'])
    const [variant] = analyze(lines).variants
    expect(variant!.names).toEqual(['Linker Fuß', 'Rechter Fuß'])
    const draft = parsePattern(lines, { size: 0, variants: { [variant!.key]: 1 } })
    expect(draft.steps.filter((s) => s.included && s.text.startsWith('Reihe')).map((s) => s.text)).toEqual(['Reihe 1: alle M re.'])
  })
  it('verbindet Beschriftung und Text trotz Lücke', () => {
    expect(toLines([item('1. Reihe:', 10, 20), item('alle M re', 120, 20)]).map((l) => l.text)).toEqual(['1. Reihe: alle M re'])
  })
  it('entfernt doppelt gedruckten Text und Seitenzahlen', () => {
    const lines = toLines([item('Farbe B', 10, 20), item('Farbe B', 10.3, 20), item('7', 200, 800)])
    expect(lines.map((l) => l.text)).toEqual(['Farbe B'])
  })
  it('behandelt hervorgehobene Anweisungen nicht als Überschrift', () => {
    const lines = toLines([
      item('Das ist ein längerer Fließtext zum Vergleich.', 10, 20),
      item('Ferse', 10, 60, { font: 'bold' }),
      item('Schlage 8 M an', 10, 100, { font: 'bold' }),
    ])
    const steps = parsePattern(lines, none).steps
    expect(steps.map((s) => s.kind)).toEqual(['step', 'heading', 'step'])
    expect(steps[2]!.section).toBe('Ferse')
  })
})
