import { useRef } from 'react'
import { isFinished, work, type Project } from '../core/project'

interface Props {
  projects: Project[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onImportPattern: () => void
  onExport: () => void
  onImport: (file: File) => void
}

function status(p: Project) {
  if (p.steps.length === 0) return 'Noch keine Schritte'
  if (isFinished(p)) return 'Fertig'
  return `Schritt ${p.completedCount + 1} von ${p.steps.length}`
}

export function ProjectList({ projects, selectedId, onSelect, onCreate, onImportPattern, onExport, onImport }: Props) {
  const file = useRef<HTMLInputElement>(null)
  return (
    <nav className="sidebar" aria-label="Projekte">
      <header>
        <h1>Projekte</h1>
        <div className="actions">
          <button className="primary" onClick={onImportPattern}>Anleitung importieren</button>
          <button onClick={onCreate}>Neues Projekt</button>
        </div>
      </header>
      {projects.length === 0 && <p className="empty">Noch keine Projekte.</p>}
      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            <button
              className="project"
              aria-current={p.id === selectedId ? 'page' : undefined}
              onClick={() => onSelect(p.id)}
            >
              <strong>{p.name}</strong>
              <progress value={work(p).done} max={Math.max(work(p).total, 1)} aria-hidden="true" />
              <small>{status(p)}</small>
            </button>
          </li>
        ))}
      </ul>
      <footer>
        <button onClick={onExport} disabled={projects.length === 0}>Sichern</button>
        <button onClick={() => file.current?.click()}>Wiederherstellen</button>
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          hidden
          data-testid="import"
          onChange={(event) => {
            const chosen = event.target.files?.[0]
            event.target.value = ''
            if (chosen) onImport(chosen)
          }}
        />
      </footer>
    </nav>
  )
}
