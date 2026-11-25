import { openDB, type DBSchema } from 'idb'
import { upgrade, type Project, type StoredProject } from '../core/project'

/** Originaldatei einer importierten Anleitung. */
export interface Source {
  name: string
  data: ArrayBuffer
}

interface Schema extends DBSchema {
  projects: { key: string; value: StoredProject }
  sources: { key: string; value: Source }
}

const open = () =>
  openDB<Schema>('strickapp', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) db.createObjectStore('projects', { keyPath: 'id' })
      if (oldVersion < 2) db.createObjectStore('sources')
    },
    // Einer neueren Version in einem anderen Fenster nicht im Weg stehen.
    blocking(_current, _blocked, event) {
      ;(event.target as IDBDatabase).close()
      connection = undefined
    },
  })

let connection: ReturnType<typeof open> | undefined
function db() {
  // Nach einem Fehler beim nächsten Zugriff erneut versuchen.
  connection ??= open().catch((error) => {
    connection = undefined
    throw error
  })
  return connection
}

export async function loadProjects(): Promise<Project[]> {
  const all = (await (await db()).getAll('projects')).map(upgrade)
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function addProject(project: Project, source?: Source): Promise<void> {
  const tx = (await db()).transaction(['projects', 'sources'], 'readwrite')
  await Promise.all([
    tx.objectStore('projects').add(project),
    source && tx.objectStore('sources').put(source, project.id),
    tx.done,
  ])
}

export async function loadSource(projectId: string): Promise<Source | undefined> {
  return (await db()).get('sources', projectId)
}

/** Lesen und Schreiben in einer Transaktion, damit kein Stand verloren geht. */
export async function updateProject(id: string, change: (p: Project) => Project): Promise<void> {
  const tx = (await db()).transaction('projects', 'readwrite')
  const current = await tx.store.get(id)
  if (current) await tx.store.put({ ...change(upgrade(current)), updatedAt: Date.now() })
  await tx.done
}

export async function deleteProject(id: string): Promise<void> {
  const tx = (await db()).transaction(['projects', 'sources'], 'readwrite')
  await Promise.all([tx.objectStore('projects').delete(id), tx.objectStore('sources').delete(id), tx.done])
}

/** Ergänzt Projekte. Vorhandene werden nur durch neuere Stände ersetzt. */
export async function mergeProjects(projects: Project[]): Promise<number> {
  const tx = (await db()).transaction('projects', 'readwrite')
  let count = 0
  for (const project of projects) {
    const current = await tx.store.get(project.id)
    if (current && current.updatedAt >= project.updatedAt) continue
    await tx.store.put(project)
    count += 1
  }
  await tx.done
  return count
}
