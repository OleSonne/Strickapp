import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4173/Strickapp/' },
  webServer: { command: 'npm run preview', url: 'http://localhost:4173/Strickapp/' },
  // WebKit kommt Safari auf dem iPad am nächsten.
  projects: [
    { name: 'ipad', use: { ...devices['iPad Pro 11 landscape'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
  ],
})
