import { afterAll, beforeAll, beforeEach } from 'vitest';
import { assertTestEnvironment, clearDatabase, db, verifyDatabaseConnection } from './database.js';
import { resetRateLimits } from './rate-limits.js';
import { startServer, stopServer } from './server.js';

assertTestEnvironment();

beforeAll(async () => {
  await verifyDatabaseConnection();
  await startServer();
});

beforeEach(async () => {
  await clearDatabase();
  await resetRateLimits();
});

afterAll(async () => {
  try {
    await stopServer();
    await clearDatabase();
  } finally {
    await db.$disconnect();
  }
});
