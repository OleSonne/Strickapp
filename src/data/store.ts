import { openDB, type DBSchema } from 'idb'
import type { Project } from '../core/project'

interface Schema extends DBSchema {
  projects: { key: string; value: Project }
}

const open = () =>
  openDB<Schema>('strickapp', 1, {
    upgrade(db) {
      db.createObjectStore('projects', { keyPath: 'id' })
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
  const all = await (await db()).getAll('projects')
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function addProject(project: Project): Promise<void> {
  await (await db()).add('projects', project)
}

/** Lesen und Schreiben in einer Transaktion, damit kein Stand verloren geht. */
export async function updateProject(id: string, change: (p: Project) => Project): Promise<void> {
  const tx = (await db()).transaction('projects', 'readwrite')
  const current = await tx.store.get(id)
  if (current) await tx.store.put({ ...change(current), updatedAt: Date.now() })
  await tx.done
}

export async function deleteProject(id: string): Promise<void> {
  await (await db()).delete('projects', id)
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
