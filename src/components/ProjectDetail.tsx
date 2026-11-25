import { useEffect, useRef, useState } from 'react'
import { rangeLabel, untilLabel } from '../core/labels'
import {
  advance, canMove, canUndo, deleteRepeat, deleteStep, isFinished, leaveRepeat, moveStep, needsDecision,
  repeatAt, undo, type Project, type Repeat, type Step,
} from '../core/project'
import { KnitView } from './KnitView'


interface Props {
  project: Project
  onChange: (change: (p: Project) => Project) => void
  onAddSteps: () => void
  onEditStep: (step: Step) => void
  onEditRepeat: (repeat?: Repeat) => void
  onRename: () => void
  onDelete: () => void
  onBack: () => void
}

export function ProjectDetail({ project, onChange, onAddSteps, onEditStep, onEditRepeat, onRename, onDelete, onBack }: Props) {
  const [overview, setOverview] = useState(false)
  const [wantsEdit, setEditing] = useState(false)
  const current = useRef<HTMLLIElement>(null)
  const { steps, completedCount } = project
  const showList = overview || steps.length === 0
  const editing = wantsEdit && showList

  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest' })
  }, [completedCount, showList])

  return (
    <main className="detail">
      <header>
        <button className="back" onClick={onBack}>Projekte</button>
        <h1>{project.name}</h1>
        <div className="actions">
          {steps.length > 0 && (
            <button onClick={() => setOverview(!overview)}>{overview ? 'Stricken' : 'Übersicht'}</button>
          )}
          {showList && <button onClick={onAddSteps}>Schritte hinzufügen</button>}
          {showList && (
            <button aria-pressed={editing} onClick={() => setEditing(!editing)}>
              {editing ? 'Fertig bearbeitet' : 'Bearbeiten'}
            </button>
          )}
        </div>
        {editing && (
          <div className="actions">
            {steps.length > 0 && <button onClick={() => onEditRepeat()}>Wiederholung hinzufügen</button>}
            <button onClick={onRename}>Umbenennen</button>
            <button className="danger" onClick={onDelete}>Projekt löschen</button>
          </div>
        )}
      </header>

      {steps.length === 0 && <p className="empty">Noch keine Schritte. Füge oben welche hinzu.</p>}
      {!showList && <KnitView project={project} />}
      {showList && <ol>
        {steps.map((step, index) => {
          const state = index < completedCount ? 'done' : index === completedCount ? 'current' : 'open'
          const repeat = repeatAt(project, index)
          const startsRepeat = repeat?.stepIds[0] === step.id
          return (
            <li
              key={step.id}
              ref={state === 'current' ? current : undefined}
              className={`step ${state}${repeat ? ' repeated' : ''}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {repeat && startsRepeat && (
                <div className="repeat">
                  <span>↻ {rangeLabel(project, repeat)}: {untilLabel(repeat)}</span>
                  {editing && (
                    <span className="actions">
                      <button onClick={() => onEditRepeat(repeat)}>Wiederholung ändern</button>
                      <button className="danger" onClick={() => onChange((p) => deleteRepeat(p, repeat.id))}>
                        Wiederholung entfernen
                      </button>
                    </span>
                  )}
                </div>
              )}
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
                  <button aria-label={`Schritt ${index + 1} nach oben`} disabled={!canMove(project, step.id, -1)}
                    onClick={() => onChange((p) => moveStep(p, step.id, -1))}>↑</button>
                  <button aria-label={`Schritt ${index + 1} nach unten`} disabled={!canMove(project, step.id, 1)}
                    onClick={() => onChange((p) => moveStep(p, step.id, 1))}>↓</button>
                  <button aria-label={`Schritt ${index + 1} ändern`} onClick={() => onEditStep(step)}>Ändern</button>
                  <button className="danger" aria-label={`Schritt ${index + 1} löschen`}
                    onClick={() => onChange((p) => deleteStep(p, step.id))}>Löschen</button>
                </span>
              )}
            </li>
          )
        })}
      </ol>}

      {steps.length > 0 && (
        <div className="controls">
          <button disabled={!canUndo(project)} onClick={() => onChange(undo)}>Rückgängig</button>
          {needsDecision(project) ? (
            <div className="decision">
              <button className="primary" onClick={() => onChange(advance)}>Noch ein Durchgang</button>
              <button className="primary" onClick={() => onChange(leaveRepeat)}>Erreicht, weiter</button>
            </div>
          ) : (
            <button className="primary" disabled={isFinished(project)} onClick={() => onChange(advance)}>
              {isFinished(project) ? 'Fertig' : 'Schritt erledigt'}
            </button>
          )}
        </div>
      )}
    </main>
  )
}
