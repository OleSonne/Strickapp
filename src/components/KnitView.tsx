import { useState } from 'react'
import { rangeLabel, roundLabel } from '../core/labels'
import { ColorText } from './ColorText'
import { ChartRows } from './ChartRows'
import { advance, isFinished, repeatAt, type Project } from '../core/project'

export function KnitView({ project, onOriginal, onChart }: {
  project: Project
  onOriginal: (page: number) => void
  onChart: () => void
}) {
  const [showWording, setShowWording] = useState(false)
  const step = project.steps[project.completedCount]
  if (isFinished(project) || !step) {
    return (
      <section className="knit" aria-live="polite">
        <p className="knit-text">Geschafft! Alle Schritte sind erledigt.</p>
      </section>
    )
  }
  const repeat = repeatAt(project, project.completedCount)
  const next = advance(project)
  const following = next.steps[next.completedCount]
  const chart = project.charts.find((c) => c.id === step.chart?.id)
  const again = next.completedCount <= project.completedCount
  return (
    <section className="knit">
      <div aria-live="polite" aria-atomic="true">
        <p className="position">{step.section && `${step.section} · `}Schritt {project.completedCount + 1} von {project.steps.length}</p>
        {repeat && (
          <p className="round">
            <strong>{roundLabel(project)}</strong> <span>({rangeLabel(project, repeat)})</span>
          </p>
        )}
        <p className="knit-text"><ColorText text={step.text} /></p>
      </div>
      {chart && step.chart && <ChartRows projectId={project.id} chart={chart} row={step.chart.row} />}
      {step.tips?.map((tip, i) => (
        <p key={i} className="tip-box">
          <strong>{tip.after ? 'Nach der Wiederholung: ' : 'Tipp: '}</strong>{tip.text}
        </p>
      ))}
      {step.note && <p className="warning">{step.note}</p>}
      {showWording && step.original && <p className="next">Im Original: {step.original}</p>}
      <div className="actions">
        {step.original && (
          <button aria-pressed={showWording} onClick={() => setShowWording(!showWording)}>Wortlaut</button>
        )}
        {step.page !== undefined && !step.chart && (
          <button onClick={onChart}>Strickschrift einrichten</button>
        )}
        {step.page !== undefined && (
          <button onClick={() => onOriginal(step.page!)}>Originalseite {step.page}</button>
        )}
      </div>
      <p className="next">
        {again ? 'Danach wieder: ' : 'Danach: '}
        {following ? following.text : 'fertig'}
      </p>
    </section>
  )
}
