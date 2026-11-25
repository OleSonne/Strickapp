import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  )
}

export interface TextRequest {
  title: string
  label: string
  initial?: string
  multiline?: boolean
  onSave: (text: string) => Promise<boolean>
}

export function TextDialog({ request, onClose }: { request: TextRequest; onClose: () => void }) {
  const [text, setText] = useState(request.initial ?? '')
  const field = {
    value: text,
    autoFocus: true,
    onChange: (event: { target: { value: string } }) => setText(event.target.value),
  }
  return (
    <Modal title={request.title} onClose={onClose}>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (text.trim() && (await request.onSave(text))) onClose()
        }}
      >
        <label>
          {request.label}
          {request.multiline ? <textarea rows={8} {...field} /> : <input {...field} />}
        </label>
        <div className="actions">
          <button type="button" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="primary" disabled={!text.trim()}>Sichern</button>
        </div>
      </form>
    </Modal>
  )
}

export interface ConfirmRequest {
  title: string
  message: string
  onConfirm: () => Promise<boolean>
}

export function ConfirmDialog({ request, onClose }: { request: ConfirmRequest; onClose: () => void }) {
  return (
    <Modal title={request.title} onClose={onClose}>
      <p>{request.message}</p>
      <div className="actions">
        <button autoFocus onClick={onClose}>Abbrechen</button>
        <button
          className="danger"
          onClick={async () => {
            if (await request.onConfirm()) onClose()
          }}
        >
          Löschen
        </button>
      </div>
    </Modal>
  )
}
