import { useEffect, useRef, useState } from 'react'
import { advance, deleteStep, goBack, isFinished, moveStep, type Project, type Step } from '../core/project'

interface Props {
  project: Project
  onChange: (change: (p: Project) => Project) => void
  onAddSteps: () => void
  onEditStep: (step: Step) => void
  onRename: () => void
  onDelete: () => void
  onBack: () => void
}

export function ProjectDetail({ project, onChange, onAddSteps, onEditStep, onRename, onDelete, onBack }: Props) {
  const [editing, setEditing] = useState(false)
  const current = useRef<HTMLLIElement>(null)
  const { steps, completedCount } = project

  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest' })
  }, [completedCount])

  return (
    <main className="detail">
      <header>
        <button className="back" onClick={onBack}>Projekte</button>
        <h1>{project.name}</h1>
        <div className="actions">
          <button onClick={onAddSteps}>Schritte hinzufügen</button>
          <button aria-pressed={editing} onClick={() => setEditing(!editing)}>
            {editing ? 'Fertig bearbeitet' : 'Bearbeiten'}
          </button>
        </div>
        {editing && (
          <div className="actions">
            <button onClick={onRename}>Umbenennen</button>
            <button className="danger" onClick={onDelete}>Projekt löschen</button>
          </div>
        )}
      </header>

      {steps.length === 0 && <p className="empty">Noch keine Schritte. Füge oben welche hinzu.</p>}
      <ol>
        {steps.map((step, index) => {
          const state = index < completedCount ? 'done' : index === completedCount ? 'current' : 'open'
          return (
            <li
              key={step.id}
              ref={state === 'current' ? current : undefined}
              className={`step ${state}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="mark" aria-hidden="true">
                {state === 'done' ? '✓' : state === 'current' ? '▶' : ''}
              </span>
              <span className="number">{index + 1}.</span>
              <span className="text">
                {state === 'done' && <span className="sr-only">Erledigt: </span>}
                {step.text}
              </span>
              {editing && (
                <span className="actions">
                  <button aria-label={`Schritt ${index + 1} nach oben`} disabled={index === 0}
                    onClick={() => onChange((p) => moveStep(p, step.id, -1))}>↑</button>
                  <button aria-label={`Schritt ${index + 1} nach unten`} disabled={index === steps.length - 1}
                    onClick={() => onChange((p) => moveStep(p, step.id, 1))}>↓</button>
                  <button aria-label={`Schritt ${index + 1} ändern`} onClick={() => onEditStep(step)}>Ändern</button>
                  <button className="danger" aria-label={`Schritt ${index + 1} löschen`}
                    onClick={() => onChange((p) => deleteStep(p, step.id))}>Löschen</button>
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {steps.length > 0 && (
        <div className="controls">
          <button disabled={completedCount === 0} onClick={() => onChange(goBack)}>Zurück</button>
          <button className="primary" disabled={isFinished(project)} onClick={() => onChange(advance)}>
            {isFinished(project) ? 'Fertig' : 'Schritt erledigt'}
          </button>
        </div>
      )}
    </main>
  )
}
