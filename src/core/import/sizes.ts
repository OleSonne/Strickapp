const NUMBER = String.raw`\d+(?:[.,]\d+)?`
// 6 (6) · 12 (14) 16 · 34 (34) 35 (35)
const SEQUENCE = new RegExp(String.raw`(?<![\d.,])${NUMBER}\s?\(${NUMBER}\)(?:\s?${NUMBER}\s?\(${NUMBER}\))*(?:\s?${NUMBER}(?![\d.,]*\d)(?!\s?\(${NUMBER}\)))?`, 'g')

const values = (sequence: string) => sequence.match(new RegExp(NUMBER, 'g')) ?? []

/** Häufigste Anzahl von Größenwerten, 1 wenn es keine Größen gibt. */
export function countSizes(texts: string[]): number {
  const votes = new Map<number, number>()
  for (const text of texts) {
    for (const match of text.match(SEQUENCE) ?? []) {
      const n = values(match).length
      votes.set(n, (votes.get(n) ?? 0) + 1)
    }
  }
  const best = [...votes].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]
  return best && best[1] >= 2 ? best[0] : 1
}

/** Setzt den Wert der gewählten Größe ein. Abweichende Zahlenfolgen bleiben stehen. */
export function pickSize(text: string, count: number, index: number): { text: string; unclear: boolean } {
  if (count < 2) return { text, unclear: false }
  let unclear = false
  const picked = text.replace(SEQUENCE, (match) => {
    const found = values(match)
    // Eine folgende Zahl kann schon zum nächsten Satzteil gehören.
    if (found.length === count + 1 && !match.endsWith(')')) {
      return `${found[index]}${match.slice(match.lastIndexOf(')') + 1)}`
    }
    if (found.length !== count) {
      unclear = true
      return match
    }
    return found[index]!
  })
  return { text: picked, unclear }
}

/** Beschriftungen aus einer Zeile wie „Größen: S (M) L“, sonst „Größe 1“ usw. */
export function sizeNames(texts: string[], count: number): string[] {
  for (const [i, text] of texts.entries()) {
    const match = /^(?:Größen?|Sizes?)\b[^:]*:\s*(.*)$/i.exec(text)
    if (!match) continue
    const [, label = '', line = ''] = /^(?:(.*):)?\s*(.*)$/.exec(match[1] || texts[i + 1] || '') ?? []
    const names = line.split(/[\s()]+/).filter(Boolean)
    if (names.length === count) return label ? names.map((n) => `${label.trim()} ${n}`) : names
  }
  return Array.from({ length: count }, (_, i) => `Größe ${i + 1}`)
}
