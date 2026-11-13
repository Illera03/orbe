import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}/orbe/`, locale: 'es-ES' },
  projects: [
    { name: 'chromium', testMatch: '*.e2e.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', testMatch: '*.e2e.ts', use: { ...devices['Desktop Safari'] } },
    { name: 'capturas', testMatch: 'capturas.ts', use: { ...devices['Desktop Chrome'] } },
  ],
  // Sirve el build de producción (base /orbe/), igual que GitHub Pages. En CI el paso anterior ya ha compilado.
  webServer: {
    command: `${process.env.CI ? '' : 'npm run build && '}npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/orbe/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
