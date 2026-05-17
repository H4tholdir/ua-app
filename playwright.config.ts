import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'authenticated',
      testMatch: /consegna-completa\.spec\.ts|precheck-mdr-errori\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: 'tests/e2e/.auth/user.json' },
    },
    {
      name: 'public',
      testMatch: /consegna\.spec\.ts|lavori\.spec\.ts|prove\.spec\.ts|dashboard\.spec\.ts/,
    },
    {
      name: 'cross-tenant',
      testMatch: /rls-cross-tenant\.spec\.ts/,
    },
    {
      name: 'api-coverage',
      testMatch: /api-coverage\.spec\.ts/,
    },
  ],
})
