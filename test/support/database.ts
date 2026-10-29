import { inject } from 'vitest';
import { db } from '../../src/db/prisma.js';
import { TEST_DATABASE_NAME, validateTestDatabaseUrl } from './environment.js';

export { db };

export function assertTestEnvironment() {
  const expected = inject('testDatabaseUrl');
  validateTestDatabaseUrl(expected, inject('applicationDatabaseUrl'));
  if (process.env.DATABASE_URL !== expected || process.env.TEST_DATABASE_URL !== expected) {
    throw new Error('The application is not configured for the guarded integration database.');
  }
}

export async function verifyDatabaseConnection() {
  assertTestEnvironment();
  const result = await db.$queryRaw<{ database: string }[]>`
    SELECT current_database() AS database
  `;
  if (result[0]?.database !== TEST_DATABASE_NAME) {
    throw new Error('Refusing to use an unexpected database for integration tests.');
  }
}

export async function clearDatabase() {
  assertTestEnvironment();
  // The fixed list includes all business tables and deliberately preserves migration history.
  await db.$executeRaw`
    TRUNCATE TABLE "CreditAllocation", "MonthlyGeneration", "MonthlyDistributorBalance",
      "User", "ClientCompany", "PowerPlant", "Distributor"
  `;
}

export async function snapshotDatabase() {
  const orderBy = { id: 'asc' } as const;
  const [users, companies, plants, distributors, generations, allocations, balances] =
    await Promise.all([
      db.user.findMany({ orderBy }),
      db.clientCompany.findMany({ orderBy }),
      db.powerPlant.findMany({ orderBy }),
      db.distributor.findMany({ orderBy }),
      db.monthlyGeneration.findMany({ orderBy }),
      db.creditAllocation.findMany({ orderBy }),
      db.monthlyDistributorBalance.findMany({ orderBy }),
    ]);
  return { users, companies, plants, distributors, generations, allocations, balances };
}
