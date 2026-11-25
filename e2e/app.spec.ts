import { expect, test, type Page } from '@playwright/test'

async function addProject(page: Page, name: string, steps: string) {
  await page.getByRole('button', { name: 'Neues Projekt' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByRole('dialog').getByRole('button', { name: 'Sichern' }).click()
  await page.getByRole('button', { name: 'Schritte hinzufügen' }).click()
  await page.getByLabel('Jede Zeile wird ein Schritt').fill(steps)
  await page.getByRole('dialog').getByRole('button', { name: 'Sichern' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}
async function showList(page: Page) {
  const back = page.locator('.back')
  if (await back.isVisible()) await back.click()
}
const current = (page: Page) => page.locator('.knit-text')

test.beforeEach(({ page }) => page.goto('./').then(() => {}))

test('jedes Projekt behält seinen Stand nach dem Neuladen', async ({ page }) => {
  await addProject(page, 'Schal', 'eins\nzwei\ndrei')
  await page.getByRole('button', { name: 'Schritt erledigt' }).click()
  await expect(current(page)).toHaveText('zwei')
  await showList(page)
  await addProject(page, 'Mütze', 'A\nB')
  await expect(current(page)).toHaveText('A')
  await page.reload()
  await expect(current(page)).toHaveText('A')
  await showList(page)
  await page.locator('.project', { hasText: 'Schal' }).click()
  await expect(current(page)).toHaveText('zwei')
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(current(page)).toHaveText('eins')
})

test('Schritte und Projekt bearbeiten und löschen', async ({ page }) => {
  await addProject(page, 'Schal', 'eins\nzwei')
  await page.getByRole('button', { name: 'Übersicht' }).click()
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
  await page.getByRole('button', { name: 'Schritt 2 nach oben' }).click()
  await expect(page.locator('.step .text').first()).toHaveText('zwei')
  await page.getByRole('button', { name: 'Schritt 1 löschen' }).click()
  await expect(page.locator('.step')).toHaveCount(1)
  await page.getByRole('button', { name: 'Projekt löschen' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click()
  await expect(page.getByText('Noch keine Projekte.')).toBeVisible()
})

test('Sicherung wiederherstellen', async ({ page }) => {
  await addProject(page, 'Schal', 'eins\nzwei')
  await showList(page)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Sichern' }).click()
  const path = await (await download).path()
  await page.locator('.project').click()
  await page.getByRole('button', { name: 'Übersicht' }).click()
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
  await page.getByRole('button', { name: 'Projekt löschen' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click()
  await page.getByTestId('import').setInputFiles(path)
  await expect(page.getByText('1 Projekt wiederhergestellt.')).toBeVisible()
  await expect(page.locator('.project', { hasText: 'Schal' })).toBeVisible()
})

async function addRepeat(page: Page, to: string, fill: () => Promise<void>) {
  await page.getByRole('button', { name: 'Übersicht' }).click()
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
  await page.getByRole('button', { name: 'Wiederholung hinzufügen' }).click()
  await page.getByLabel('Bis Schritt').selectOption(to)
  await fill()
  await page.getByRole('dialog').getByRole('button', { name: 'Sichern' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Stricken' }).click()
}

test('feste Wiederholung zählt, merkt sich den Durchgang und geht zurück', async ({ page }) => {
  await addProject(page, 'Schal', 'eins\nzwei\ndrei')
  await addRepeat(page, '1', () => page.getByLabel('Wie oft insgesamt').fill('2'))
  const done = page.getByRole('button', { name: 'Schritt erledigt' })
  await done.click()
  await expect(current(page)).toHaveText('zwei')
  await done.click()
  await expect(page.getByText('Durchgang 2 von 2')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Durchgang 2 von 2')).toBeVisible()
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(page.getByText('Durchgang 1 von 2')).toBeVisible()
  await expect(current(page)).toHaveText('zwei')
})

test('Wiederholung bis zu einer Bedingung', async ({ page }) => {
  await addProject(page, 'Schal', 'eins\nzwei')
  await addRepeat(page, '0', async () => {
    await page.getByLabel('Wie lange').selectOption('condition')
    await page.getByLabel(/Bedingung/).fill('20 cm')
  })
  await page.getByRole('button', { name: 'Noch ein Durchgang' }).click()
  await expect(page.getByText('Durchgang 2, bis: 20 cm')).toBeVisible()
  await page.getByRole('button', { name: 'Erreicht, weiter' }).click()
  await expect(current(page)).toHaveText('zwei')
  await page.getByRole('button', { name: 'Schritt erledigt' }).click()
  await expect(page.getByText('Geschafft!')).toBeVisible()
})

test('ungültige Wiederholung zeigt einen Hinweis', async ({ page }) => {
  await addProject(page, 'Schal', 'eins\nzwei')
  await page.getByRole('button', { name: 'Übersicht' }).click()
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
  await page.getByRole('button', { name: 'Wiederholung hinzufügen' }).click()
  await page.getByLabel('Wie oft insgesamt').fill('0')
  await page.getByRole('dialog').getByRole('button', { name: 'Sichern' }).click()
  await expect(page.getByRole('alert')).toContainText('zwischen 2 und 9999')
})

test('Projekte aus M2 bleiben erhalten', async ({ page }) => {
  // Erst danach hat die App die Datenbank angelegt.
  await expect(page.getByText('Noch keine Projekte.')).toBeVisible()
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('strickapp', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const tx = request.result.transaction('projects', 'readwrite')
      tx.objectStore('projects').put({
        id: 'alt', name: 'Altes Projekt', createdAt: 1, updatedAt: 1, completedCount: 1,
        steps: [{ id: 'a', text: 'eins' }, { id: 'b', text: 'zwei' }],
      })
      tx.oncomplete = () => { request.result.close(); resolve() }
    }
  }))
  await page.reload()
  await page.locator('.project', { hasText: 'Altes Projekt' }).click()
  await expect(current(page)).toHaveText('zwei')
  await page.getByRole('button', { name: 'Schritt erledigt' }).click()
  await expect(page.getByText('Geschafft!')).toBeVisible()
})
