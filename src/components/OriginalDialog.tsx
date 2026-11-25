import { useEffect, useRef, useState } from 'react'
import { renderPage } from '../data/pdf'
import { loadSource } from '../data/store'
import { Modal } from './Dialogs'

export function OriginalDialog({ projectId, page, onClose }: { projectId: string; page: number; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [current, setCurrent] = useState(page)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<string | null>('Wird geladen …')

  useEffect(() => {
    let active = true
    setStatus('Wird geladen …')
    void (async () => {
      try {
        const source = await loadSource(projectId)
        if (!active) return
        if (!source) return setStatus('Das Original ist auf diesem Gerät nicht gespeichert.')
        const target = document.createElement('canvas')
        const pages = await renderPage(source.data, current, target)
        if (!active || !canvas.current) return
        canvas.current.width = target.width
        canvas.current.height = target.height
        canvas.current.getContext('2d')?.drawImage(target, 0, 0)
        setTotal(pages)
        setStatus(null)
      } catch {
        if (active) setStatus('Die Seite kann nicht angezeigt werden.')
      }
    })()
    return () => {
      active = false
    }
  }, [projectId, current])

  return (
    <Modal title="Originalanleitung" onClose={onClose} wide>
      {status && <p role="status">{status}</p>}
      <canvas ref={canvas} className="original" aria-label={`Seite ${current}`} role="img" />
      <div className="actions">
        <button disabled={current <= 1} onClick={() => setCurrent(current - 1)}>Vorige Seite</button>
        <span className="page">{total > 0 && `${current} von ${total}`}</span>
        <button disabled={current >= total} onClick={() => setCurrent(current + 1)}>Nächste Seite</button>
        <button className="primary" onClick={onClose}>Schließen</button>
      </div>
    </Modal>
  )
}
