import { afterAll, beforeAll, beforeEach } from 'vitest';
import { assertTestEnvironment, clearDatabase, db, verifyDatabaseConnection } from './database.js';
import { resetRateLimits } from './rate-limits.js';
import { startServer, stopServer } from './server.js';

assertTestEnvironment();

// Each test file gets a real HTTP server after the worker's database destination is confirmed.
beforeAll(async () => {
  await verifyDatabaseConnection();
  await startServer();
});

// Reset data and request quotas so previous scenarios cannot influence the next result.
beforeEach(async () => {
  await clearDatabase();
  await resetRateLimits();
});

// Release HTTP resources and database connections even when a test has failed.
afterAll(async () => {
  try {
    await stopServer();
    await clearDatabase();
  } finally {
    await db.$disconnect();
  }
});
