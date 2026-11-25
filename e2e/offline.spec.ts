import { expect, test } from '@playwright/test'

// Playwright kann Service Worker offline nur in Chromium zuverlässig prüfen.
test.use({ browserName: 'chromium', isMobile: false })

test('startet ohne Internet', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Projekte' })).toBeVisible()
})
