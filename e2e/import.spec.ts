import { expect, test } from '@playwright/test'

// Selbst geschriebene Anleitung, erzeugt aus e2e/fixtures/beispiel.html.
const PDF = 'e2e/fixtures/beispiel.pdf'

test('PDF importieren, stricken und Original ansehen', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Anleitung importieren' }).click()
  await page.getByTestId('pdf').setInputFiles(PDF)
  await page.getByLabel('Größe').selectOption({ label: 'groß' })
  await page.getByLabel('Name').fill('Testschal')
  await page.getByRole('button', { name: 'Schritte prüfen' }).click()
  await expect(page.getByText('insgesamt 5 Mal')).toBeVisible()
  await page.getByRole('button', { name: 'Projekt anlegen' }).click()
  await expect(page.locator('.knit-text')).toHaveText('Schlage 8 M an.')
  await page.getByRole('button', { name: 'Schritt erledigt' }).click()
  await page.getByRole('button', { name: 'Schritt erledigt' }).click()
  await expect(page.getByText('Durchgang 1 von 5')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Originalseite 1' }).click()
  await expect(page.getByText('1 von 1')).toBeVisible()
  // Die Seite ist wirklich gezeichnet, nicht leer.
  const drawn = await page.locator('canvas').evaluate((c: HTMLCanvasElement) => {
    const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    return data.some((v, i) => i % 4 === 0 && v < 100)
  })
  expect(drawn).toBe(true)
})

test('Text einfügen und Schritt abwählen', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Anleitung importieren' }).click()
  await page.getByLabel('Oder Text einfügen').fill('Reihe 1: alle M re.\nReihe 2: alle M li.')
  await page.getByRole('button', { name: 'Text verwenden' }).click()
  await page.getByRole('button', { name: 'Schritte prüfen' }).click()
  await page.getByRole('checkbox').first().uncheck()
  await page.getByRole('button', { name: 'Projekt anlegen' }).click()
  await expect(page.locator('.knit-text')).toHaveText('Reihe 2: alle M li.')
})

test('kaputte Datei zeigt einen Hinweis', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Anleitung importieren' }).click()
  await page.getByTestId('pdf').setInputFiles({ name: 'x.pdf', mimeType: 'application/pdf', buffer: Buffer.from('kein pdf') })
  await expect(page.getByRole('alert')).toContainText('nicht als PDF lesen')
})

test('Strickschrift Reihe für Reihe', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Anleitung importieren' }).click()
  await page.getByTestId('pdf').setInputFiles(PDF)
  await page.getByRole('button', { name: 'Schritte prüfen' }).click()
  await expect(page.locator('.draft.tip textarea')).toHaveValue('Nun liegen 10 M auf der Nadel.')
  await page.getByRole('button', { name: 'Projekt anlegen' }).click()
  const done = page.getByRole('button', { name: 'Schritt erledigt' })
  for (let i = 0; i < 9; i += 1) {
    const round = await page.locator('.knit').textContent()
    await done.click()
    await expect(page.locator('.knit')).not.toHaveText(round!)
  }
  await expect(page.locator('.knit-text')).toContainText('Strickschrift')
  await page.getByRole('button', { name: 'Strickschrift einrichten' }).click()
  const area = page.getByTestId('chart-area')
  await expect(page.getByText('1 von 1')).toBeVisible()
  const box = (await area.boundingBox())!
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.3)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 4 })
  await page.mouse.up()
  await page.getByLabel('Reihen', { exact: true }).fill('4')
  await page.getByRole('button', { name: 'Reihen anlegen' }).click()
  await expect(page.getByRole('alert')).toContainText('Maschenzahl')
  await page.getByLabel('Maschen', { exact: true }).fill('6')
  await page.getByRole('button', { name: 'Farben erkennen' }).click()
  await expect(page.getByTestId('preview').locator('.cells')).toHaveCount(4)
  await page.getByLabel('Name der Farbe 1').fill('Hell')
  await page.getByLabel('Gestrickt wird').selectOption('rows')
  await page.getByRole('button', { name: 'Reihen anlegen' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await done.click()
  await expect(page.getByText('Reihe 1 von 4')).toBeVisible()
  await expect(page.getByText('von rechts nach links')).toBeVisible()
  await expect(page.locator('.runs')).toContainText('× Hell')
  await done.click()
  await expect(page.getByText('von links nach rechts')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Reihe 2 von 4')).toBeVisible()
  await expect.poll(() => page.locator('canvas.strip').evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(1000)
})
