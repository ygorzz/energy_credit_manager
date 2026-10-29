import { defineConfig } from 'vitest/config';
import { loadTestEnvironment } from './test/support/environment.js';

const environment = loadTestEnvironment();

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integration/**/*.test.ts'],
    // Sequential isolated files share one guarded database without competing cleanup operations.
    pool: 'forks',
    isolate: true,
    fileParallelism: false,
    maxWorkers: 1,
    retry: 0,
    testTimeout: 10_000,
    hookTimeout: 30_000,
    globalSetup: ['./test/support/global-setup.ts'],
    setupFiles: ['./test/support/setup.ts'],
    // App modules read configuration at import time, after these overrides are installed.
    env: {
      DATABASE_URL: environment.databaseUrl,
      TEST_DATABASE_URL: environment.databaseUrl,
      JWT_SECRET: environment.jwtSecret,
      NODE_ENV: 'test',
    },
    provide: {
      testDatabaseUrl: environment.databaseUrl,
      applicationDatabaseUrl: environment.applicationDatabaseUrl,
    },
  },
});
