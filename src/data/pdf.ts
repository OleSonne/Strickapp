import type { TextItem } from '../core/import/lines'

/** pdf.js erst laden, wenn es gebraucht wird. */
async function open(data: ArrayBuffer) {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  // pdf.js übernimmt den Speicher, deshalb eine Kopie.
  const task = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) })
  return { task, document: await task.promise }
}

export interface PdfText {
  items: TextItem[]
  pageCount: number
  /** Seiten ohne lesbaren Text, z. B. Scans. */
  emptyPages: number[]
}

export async function readPdf(data: ArrayBuffer): Promise<PdfText> {
  const { task, document } = await open(data).catch(() => {
    throw new Error('Die Datei lässt sich nicht als PDF lesen.')
  })
  try {
    const items: TextItem[] = []
    const emptyPages: number[] = []
    for (let n = 1; n <= document.numPages; n += 1) {
      const page = await document.getPage(n)
      const height = page.getViewport({ scale: 1 }).height
      const content = await page.getTextContent()
      let length = 0
      for (const item of content.items) {
        if (!('str' in item)) continue
        const [, , c = 0, d = 0, x = 0, y = 0] = item.transform as number[]
        length += item.str.trim().length
        items.push({ str: item.str, x, y: height - y, w: item.width, size: Math.hypot(c, d), page: n, font: item.fontName })
      }
      if (length < 5) emptyPages.push(n)
    }
    return { items, pageCount: document.numPages, emptyPages }
  } finally {
    await task.destroy()
  }
}

/** Zeichnet eine Seite und liefert die Seitenzahl des Dokuments. */
export async function renderPage(data: ArrayBuffer, pageNumber: number, canvas: HTMLCanvasElement): Promise<number> {
  const { task, document } = await open(data)
  try {
    const page = await document.getPage(Math.min(Math.max(pageNumber, 1), document.numPages))
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(1600 / base.width, 2200 / base.height)
    const viewport = page.getViewport({ scale })
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvas, viewport }).promise
    return document.numPages
  } finally {
    await task.destroy()
  }
}
