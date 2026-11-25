/** Sucht beim Start und bei jeder Rückkehr nach einer neuen Version. */
export function watchUpdates(onReady: () => void): () => void {
  const workers = navigator.serviceWorker as ServiceWorkerContainer | undefined
  if (!workers || !import.meta.env.PROD) return () => {}
  // Beim allerersten Besuch übernimmt der Worker auch, das ist kein Update.
  let known = workers.controller !== null
  const changed = () => {
    if (known) onReady()
    known = true
  }
  workers.addEventListener('controllerchange', changed)
  const registration = workers.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
  const check = () => {
    if (document.visibilityState !== 'visible') return
    // Ohne Internet schlägt die Suche fehl, das ist in Ordnung.
    registration.then((r) => r.update()).catch(() => {})
  }
  check()
  document.addEventListener('visibilitychange', check)
  window.addEventListener('pageshow', check)
  return () => {
    workers.removeEventListener('controllerchange', changed)
    document.removeEventListener('visibilitychange', check)
    window.removeEventListener('pageshow', check)
  }
}
