import { rangeLabel, roundLabel } from '../core/labels'
import { advance, isFinished, repeatAt, type Project } from '../core/project'

export function KnitView({ project }: { project: Project }) {
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
  const again = next.completedCount <= project.completedCount
  return (
    <section className="knit">
      <div aria-live="polite" aria-atomic="true">
        <p className="position">Schritt {project.completedCount + 1} von {project.steps.length}</p>
        {repeat && (
          <p className="round">
            <strong>{roundLabel(project)}</strong> <span>({rangeLabel(project, repeat)})</span>
          </p>
        )}
        <p className="knit-text">{step.text}</p>
      </div>
      <p className="next">
        {again ? 'Danach wieder: ' : 'Danach: '}
        {following ? following.text : 'fertig'}
      </p>
    </section>
  )
}
