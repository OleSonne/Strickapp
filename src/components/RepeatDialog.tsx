import { useState } from 'react'
import type { Project, Repeat, Until } from '../core/project'
import { repeatStart } from '../core/project'
import { Modal } from './Dialogs'

interface Props {
  project: Project
  repeat?: Repeat
  onSave: (from: number, to: number, until: Until) => Promise<string | null>
  onClose: () => void
}

export function RepeatDialog({ project, repeat, onSave, onClose }: Props) {
  const start = repeat ? repeatStart(project, repeat) : 0
  const [from, setFrom] = useState(start)
  const [to, setTo] = useState(repeat ? start + repeat.stepIds.length - 1 : 0)
  const [kind, setKind] = useState<Until['kind']>(repeat?.until.kind ?? 'count')
  const [count, setCount] = useState(repeat?.until.kind === 'count' ? String(repeat.until.count) : '2')
  const [text, setText] = useState(repeat?.until.kind === 'condition' ? repeat.until.text : '')
  const [error, setError] = useState<string | null>(null)

  const options = project.steps.map((s, i) => (
    <option key={s.id} value={i}>{i + 1}. {s.text.slice(0, 60)}</option>
  ))
  return (
    <Modal title={repeat ? 'Wiederholung ändern' : 'Wiederholung hinzufügen'} onClose={onClose}>
      <form
        className="fields"
        onSubmit={async (event) => {
          event.preventDefault()
          const until: Until = kind === 'count' ? { kind, count: Number(count) } : { kind, text: text.trim() }
          const problem = await onSave(from, to, until)
          if (problem) setError(problem)
          else onClose()
        }}
      >
        <label>
          Von Schritt
          <select value={from} onChange={(e) => {
            const value = Number(e.target.value)
            setFrom(value)
            setTo(Math.max(to, value))
          }}>{options}</select>
        </label>
        <label>
          Bis Schritt
          <select value={to} onChange={(e) => setTo(Number(e.target.value))}>{options}</select>
        </label>
        <label>
          Wie lange
          <select value={kind} onChange={(e) => setKind(e.target.value as Until['kind'])}>
            <option value="count">Feste Anzahl</option>
            <option value="condition">Bis etwas erreicht ist</option>
          </select>
        </label>
        {kind === 'count' ? (
          <label>
            Wie oft insgesamt
            <input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
          </label>
        ) : (
          <label>
            Bedingung, z. B. 20 cm oder 32 Maschen
            <input value={text} onChange={(e) => setText(e.target.value)} />
          </label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          <button type="button" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="primary">Sichern</button>
        </div>
      </form>
    </Modal>
  )
}
