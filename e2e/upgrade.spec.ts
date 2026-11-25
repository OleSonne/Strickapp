import { expect, test } from '@playwright/test'

test('Datenbank aus M3 wird ohne Verlust erweitert', async ({ page }) => {
  // Alte Datenbank anlegen, bevor die App läuft.
  await page.route('**/empty.html', (route) => route.fulfill({ contentType: 'text/html', body: '<p>leer</p>' }))
  await page.goto('./empty.html')
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('strickapp', 1)
    request.onerror = () => reject(request.error)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('projects', { keyPath: 'id' }).put({
        id: 'alt', name: 'Aus M3', createdAt: 1, updatedAt: 1, completedCount: 0,
        steps: [{ id: 'a', text: 'eins' }], history: [],
        repeats: [{ id: 'r', stepIds: ['a'], until: { kind: 'count', count: 4 }, round: 2 }],
      })
    }
    request.onsuccess = () => {
      request.result.close()
      resolve()
    }
  }))
  await page.goto('./#alt')
  await expect(page.getByText('Durchgang 3 von 4')).toBeVisible()
})
