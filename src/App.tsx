import { useCallback, useEffect, useState } from 'react'
import { ConfirmDialog, TextDialog, type ConfirmRequest, type TextRequest } from './components/Dialogs'
import { ProjectDetail } from './components/ProjectDetail'
import { ProjectList } from './components/ProjectList'
import { parseBackup, toBackup } from './core/backup'
import { addSteps, createProject, editStep, rename, splitSteps, type Project } from './core/project'
import * as store from './data/store'

const idFromHash = () => location.hash.slice(1) || null

export function App() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [selectedId, setSelectedId] = useState(idFromHash)
  const [textRequest, setTextRequest] = useState<TextRequest | null>(null)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  /** Führt eine Änderung aus und zeigt danach den gespeicherten Stand. */
  const run = useCallback(async (action: () => Promise<unknown>) => {
    try {
      await action()
      setProjects(await store.loadProjects())
      return true
    } catch (error) {
      setMessage(`Das hat nicht geklappt: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }, [])

  useEffect(() => {
    void run(async () => {})
    const reload = () => {
      if (document.visibilityState === 'visible') void run(async () => {})
    }
    const onHash = () => setSelectedId(idFromHash())
    document.addEventListener('visibilitychange', reload)
    window.addEventListener('hashchange', onHash)
    return () => {
      document.removeEventListener('visibilitychange', reload)
      window.removeEventListener('hashchange', onHash)
    }
  }, [run])

  const select = (id: string | null) => {
    location.hash = id ?? ''
  }
  const selected = projects?.find((p) => p.id === selectedId)

  const create = () =>
    setTextRequest({
      title: 'Neues Projekt',
      label: 'Name',
      onSave: async (name) => {
        const project = createProject(name)
        const ok = await run(() => store.addProject(project))
        if (ok) {
          select(project.id)
          // Bittet den Browser, die Daten nicht automatisch zu löschen.
          void navigator.storage?.persist?.().catch(() => false)
        }
        return ok
      },
    })

  const exportBackup = () => {
    const blob = new Blob([toBackup(projects ?? [])], { type: 'application/json' })
    const name = `strickapp-${new Date().toISOString().slice(0, 10)}.json`
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const importBackup = (file: File) =>
    run(async () => {
      const count = await store.mergeProjects(parseBackup(await file.text()))
      setMessage(count === 1 ? '1 Projekt wiederhergestellt.' : `${count} Projekte wiederhergestellt.`)
    })

  return (
    <div className={selected ? 'app has-selection' : 'app'}>
      {projects && (
        <ProjectList
          projects={projects}
          selectedId={selectedId}
          onSelect={select}
          onCreate={create}
          onExport={exportBackup}
          onImport={importBackup}
        />
      )}
      {selected ? (
        <ProjectDetail
          key={selected.id}
          project={selected}
          onChange={(change) => void run(() => store.updateProject(selected.id, change))}
          onBack={() => select(null)}
          onAddSteps={() =>
            setTextRequest({
              title: 'Schritte hinzufügen',
              label: 'Jede Zeile wird ein Schritt',
              multiline: true,
              onSave: (text) => run(() => store.updateProject(selected.id, (p) => addSteps(p, splitSteps(text)))),
            })
          }
          onEditStep={(step) =>
            setTextRequest({
              title: 'Schritt ändern',
              label: 'Text',
              initial: step.text,
              multiline: true,
              onSave: (text) => run(() => store.updateProject(selected.id, (p) => editStep(p, step.id, text))),
            })
          }
          onRename={() =>
            setTextRequest({
              title: 'Projekt umbenennen',
              label: 'Name',
              initial: selected.name,
              onSave: (name) => run(() => store.updateProject(selected.id, (p) => rename(p, name))),
            })
          }
          onDelete={() =>
            setConfirmRequest({
              title: 'Projekt löschen?',
              message: `„${selected.name}“ wird mit allen Schritten und dem Fortschritt gelöscht.`,
              onConfirm: async () => {
                const ok = await run(() => store.deleteProject(selected.id))
                if (ok) select(null)
                return ok
              },
            })
          }
        />
      ) : (
        <main className="detail placeholder">
          <p className="empty">{projects ? 'Wähle ein Projekt aus oder lege ein neues an.' : 'Wird geladen …'}</p>
        </main>
      )}
      {textRequest && <TextDialog request={textRequest} onClose={() => setTextRequest(null)} />}
      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
      {message && (
        <div className="message" role="alert">
          <span>{message}</span>
          <button onClick={() => setMessage(null)}>OK</button>
        </div>
      )}
    </div>
  )
}
