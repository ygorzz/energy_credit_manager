import { Client } from 'pg';
import { inject } from 'vitest';
import { TEST_DATABASE_NAME, validateTestDatabaseUrl } from './environment.js';

// Auxiliary sessions use the same guarded database as Prisma, never application credentials.
export async function connectTestPostgres() {
  const connectionString = validateTestDatabaseUrl(
    inject('testDatabaseUrl'),
    inject('applicationDatabaseUrl'),
  );
  const connection = new Client({ connectionString, connectionTimeoutMillis: 5_000 });
  try {
    await connection.connect();
    const result = await connection.query<{ database: string }>(
      'SELECT current_database() AS database',
    );
    if (result.rows[0]?.database !== TEST_DATABASE_NAME) {
      throw new Error('Refusing to coordinate operations outside the exclusive test database.');
    }
    return connection;
  } catch (error) {
    await connection.end();
    throw error;
  }
}

// Inject a real late database failure to prove that earlier transaction writes are rolled back.
export async function withRejectedBalanceIncreases(operation: () => Promise<void>) {
  const connection = await connectTestPostgres();
  try {
    await connection.query(`
      CREATE FUNCTION integration_reject_balance_increase() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'integration-only-private-database-detail';
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER integration_reject_balance_increase
      BEFORE UPDATE ON "MonthlyDistributorBalance"
      FOR EACH ROW
      WHEN (NEW."totalEnergyAllocatedMwh" > OLD."totalEnergyAllocatedMwh")
      EXECUTE FUNCTION integration_reject_balance_increase();
    `);
    await operation();
  } finally {
    try {
      await connection.query(`
        DROP TRIGGER IF EXISTS integration_reject_balance_increase
          ON "MonthlyDistributorBalance";
        DROP FUNCTION IF EXISTS integration_reject_balance_increase();
      `);
    } finally {
      await connection.end();
    }
  }
}
