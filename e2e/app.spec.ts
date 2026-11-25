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
const current = (page: Page) => page.locator('[aria-current=step] .text')

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
  await page.getByRole('button', { name: 'Zurück', exact: true }).click()
  await expect(current(page)).toHaveText('eins')
})

test('Schritte und Projekt bearbeiten und löschen', async ({ page }) => {
  await addProject(page, 'Schal', 'eins\nzwei')
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
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
  await page.getByRole('button', { name: 'Projekt löschen' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click()
  await page.getByTestId('import').setInputFiles(path)
  await expect(page.getByText('1 Projekt wiederhergestellt.')).toBeVisible()
  await expect(page.locator('.project', { hasText: 'Schal' })).toBeVisible()
})
