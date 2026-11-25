import { useMemo, useRef, useState } from 'react'
import { buildProject, tipTarget } from '../core/import/build'
import { textToLines, toLines, type Line } from '../core/import/lines'
import { analyze, parsePattern, type Choices, type DraftRepeat, type DraftStep } from '../core/import/parse'
import type { Project } from '../core/project'
import { readPdf } from '../data/pdf'
import type { Source } from '../data/store'

const MAX_BYTES = 60 * 1024 * 1024

interface Loaded {
  lines: Line[]
  emptyPages: number[]
  source?: Source
}

interface Props {
  onSave: (project: Project, source?: Source) => Promise<boolean>
  onCancel: () => void
}

export function ImportView({ onSave, onCancel }: Props) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [choices, setChoices] = useState<Choices>({ size: 0, variants: {} })
  const [draft, setDraft] = useState<{ steps: DraftStep[]; repeats: DraftRepeat[]; english: boolean } | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const analysis = useMemo(() => loaded && analyze(loaded.lines), [loaded])

  const use = (next: Loaded, title: string) => {
    const found = analyze(next.lines)
    setLoaded(next)
    setName(title)
    setChoices({ size: 0, variants: Object.fromEntries(found.variants.map((v) => [v.key, 0 as const])) })
    setError(null)
  }

  const readFile = async (chosen: File) => {
    setBusy(true)
    setError(null)
    try {
      if (chosen.size > MAX_BYTES) throw new Error('Die Datei ist größer als 60 MB.')
      const data = await chosen.arrayBuffer()
      const pdf = await readPdf(data)
      if (pdf.emptyPages.length === pdf.pageCount) {
        throw new Error('Diese PDF enthält keinen lesbaren Text, nur Bilder. Kopiere den Text und füge ihn unten ein.')
      }
      use({ lines: toLines(pdf.items), emptyPages: pdf.emptyPages, source: { name: chosen.name, data } },
        chosen.name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' '))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }

  if (!loaded || !analysis) {
    return (
      <main className="detail import">
        <header>
          <h1>Anleitung importieren</h1>
          <p className="empty">Die Datei bleibt auf deinem Gerät.</p>
        </header>
        <div className="actions">
          <button className="primary" disabled={busy} onClick={() => file.current?.click()}>
            {busy ? 'Wird gelesen …' : 'PDF auswählen'}
          </button>
          <button onClick={onCancel}>Abbrechen</button>
        </div>
        <input ref={file} type="file" accept=".pdf,application/pdf" hidden data-testid="pdf"
          onChange={(event) => {
            const chosen = event.target.files?.[0]
            event.target.value = ''
            if (chosen) void readFile(chosen)
          }} />
        {error && <p className="error" role="alert">{error}</p>}
        <label className="fields">
          Oder Text einfügen
          <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <div className="actions">
          <button disabled={!text.trim()} onClick={() => use({ lines: textToLines(text), emptyPages: [] }, 'Neue Anleitung')}>
            Text verwenden
          </button>
        </div>
      </main>
    )
  }

  if (!draft) {
    return (
      <main className="detail import">
        <header><h1>Auswahl</h1></header>
        <div className="fields">
          <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          {analysis.sizeNames.length > 0 && (
            <label>
              Größe
              <select value={choices.size} onChange={(e) => setChoices({ ...choices, size: Number(e.target.value) })}>
                {analysis.sizeNames.map((n, i) => <option key={i} value={i}>{n}</option>)}
              </select>
            </label>
          )}
          {analysis.variants.map((v) => (
            <label key={v.key}>
              Variante: {v.key}
              <select value={choices.variants[v.key] ?? 2} onChange={(e) =>
                setChoices({ ...choices, variants: { ...choices.variants, [v.key]: Number(e.target.value) as 0 | 1 | 2 } })}>
                <option value={0}>{v.names[0]}</option>
                <option value={1}>{v.names[1]}</option>
                <option value={2}>Beide</option>
              </select>
            </label>
          ))}
        </div>
        {loaded.emptyPages.length > 0 && (
          <p className="error">Ohne lesbaren Text: Seite {loaded.emptyPages.join(', ')}. Diese Seiten fehlen in den Schritten.</p>
        )}
        <div className="actions">
          <button onClick={() => setLoaded(null)}>Zurück</button>
          <button className="primary" disabled={!name.trim()} onClick={() => setDraft(parsePattern(loaded.lines, choices))}>
            Schritte prüfen
          </button>
        </div>
      </main>
    )
  }

  const change = (id: string, patch: Partial<DraftStep>) =>
    setDraft({ ...draft, steps: draft.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) })
  const included = draft.steps.filter((s) => s.kind === 'step' && s.included)
  const warnings = included.filter((s) => s.warnings.length > 0).length

  const join = (index: number) => {
    const step = draft.steps[index]!
    const before = draft.steps[index - 1]!
    const merged: DraftStep = {
      ...before,
      text: `${before.text} ${step.text}`,
      original: `${before.original} ${step.original}`,
      included: before.included || step.included,
      warnings: [...new Set([...before.warnings, ...step.warnings])],
    }
    setDraft({
      ...draft,
      steps: draft.steps.flatMap((s, i) => (i === index - 1 ? [merged] : i === index ? [] : [s])),
      repeats: draft.repeats
        .map((r) => ({ ...r, stepIds: r.stepIds.filter((id) => id !== step.id) }))
        .filter((r) => r.stepIds.length > 0),
    })
  }

  const usable = included
  const tipPlace = (index: number) => {
    const target = tipTarget(draft.steps, index, usable)
    return target ? `Tipp zu: ${target.text.slice(0, 70)}` : 'Noch kein passender Schritt.'
  }

  const save = async () => {
    setBusy(true)
    const project = buildProject(name, draft.steps, draft.repeats)
    if (!(await onSave(project, loaded.source))) setBusy(false)
  }

  return (
    <main className="detail import">
      <header>
        <h1>Schritte prüfen</h1>
        <p className="empty">
          {included.length} Schritte ausgewählt, {warnings} mit Hinweis. Vergleiche sie mit deiner Anleitung: Die Erkennung
          kann Fehler machen. Ein Zeilenumbruch im Text teilt einen Schritt.
        </p>
        {draft.english && <p className="warning">Englische Anleitung: Die Schritte bleiben vorerst auf Englisch.</p>}
      </header>
      <ol>
        {draft.steps.map((step, index) => {
          const repeat = draft.repeats.find((r) => r.stepIds[0] === step.id)
          const inRepeat = draft.repeats.some((r) => r.stepIds.includes(step.id))
          const previous = draft.steps[index - 1]
          if (step.kind === 'heading') return (
            <li key={step.id} className="draft-heading">
              {step.text}{' '}
              <button className="small" onClick={() => change(step.id, { kind: 'step', included: true })}>
                Als Schritt übernehmen
              </button>
            </li>
          )
          return (
            <li key={step.id} className={`draft${step.kind === 'tip' ? ' tip' : ''}${step.included ? '' : ' off'}${inRepeat ? ' repeated' : ''}`}>
              {repeat && (
                <div className="repeat">
                  <span>
                    ↻ {repeat.stepIds.length === 1 ? 'Dieser Schritt' : `Diese ${repeat.stepIds.length} Schritte`}:{' '}
                    {repeat.until.kind === 'count' ? `insgesamt ${repeat.until.count} Mal` : `bis ${repeat.until.text}`}
                  </span>
                  <button onClick={() => setDraft({
                    ...draft,
                    repeats: draft.repeats.filter((r) => r.id !== repeat.id),
                    // Die Angabe nicht verlieren, sondern als Schritt behalten.
                    steps: draft.steps.flatMap((s) => s.id === repeat.stepIds.at(-1)
                      ? [s, { ...s, id: `${repeat.id}-text`, text: repeat.original, original: repeat.original, warnings: [] }]
                      : [s]),
                  })}>
                    Als Text behalten
                  </button>
                  <small>Im Original: {repeat.original}</small>
                  {repeat.warnings.map((w) => <small key={w} className="warning">{w}</small>)}
                </div>
              )}
              <label className="check">
                <input type="checkbox" checked={step.included} onChange={(e) => change(step.id, { included: e.target.checked })} />
                <span className="sr-only">Schritt übernehmen: {step.text}</span>
              </label>
              <div className="draft-body">
                <textarea aria-label="Schritttext" value={step.text} rows={Math.min(8, Math.ceil(step.text.length / 60) + step.text.split('\n').length - 1) || 1}
                  onChange={(e) => change(step.id, { text: e.target.value })} />
                {step.original !== step.text && <small>Im Original: {step.original}</small>}
                {step.warnings.map((w) => <small key={w} className="warning">{w}</small>)}
                {step.kind === 'tip' && <small>{tipPlace(index)}</small>}
                <label className="inline">
                  Art
                  <select value={step.kind} onChange={(e) => change(step.id, { kind: e.target.value as 'step' | 'tip' })}>
                    <option value="step">Schritt</option>
                    <option value="tip">Tipp zu einem Schritt</option>
                  </select>
                </label>
                {step.kind === 'step' && previous?.kind === 'step' && (
                  <button className="small" onClick={() => join(index)}>Mit vorigem verbinden</button>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      <div className="controls">
        <button disabled={busy} onClick={() => setDraft(null)}>Zurück</button>
        <button className="primary" disabled={busy || included.length === 0} onClick={() => void save()}>
          Projekt anlegen
        </button>
      </div>
    </main>
  )
}
