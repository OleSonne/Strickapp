import { renderPage } from './pdf'
import { loadSource } from './store'

let cached: { key: string; page: Promise<{ canvas: HTMLCanvasElement; total: number }> } | undefined

/** Zuletzt gezeichnete Seite behalten, damit der Reihenwechsel sofort geht. */
export function pageImage(projectId: string, page: number) {
  const key = `${projectId}/${page}`
  if (cached?.key === key) return cached.page
  const result = (async () => {
    const source = await loadSource(projectId)
    if (!source) throw new Error('Das Original ist auf diesem Gerät nicht gespeichert.')
    const canvas = document.createElement('canvas')
    const total = await renderPage(source.data, page, canvas)
    return { canvas, total }
  })()
  cached = { key, page: result }
  result.catch(() => {
    if (cached?.key === key) cached = undefined
  })
  return result
}
