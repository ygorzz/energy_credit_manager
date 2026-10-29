import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { Client } from 'pg';
import type { TestProject } from 'vitest/node';
import { TEST_DATABASE_NAME, TEST_LOCK_KEY, validateTestDatabaseUrl } from './environment.js';

const require = createRequire(import.meta.url);

export default async function setup(project: TestProject) {
  const { testDatabaseUrl, applicationDatabaseUrl } = project.config.provide;
  const databaseUrl = validateTestDatabaseUrl(testDatabaseUrl, applicationDatabaseUrl);
  const connection = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
  let locked = false;
  try {
    await connection.connect();
    const destination = await connection.query<{ database: string }>(
      'SELECT current_database() AS database',
    );
    if (destination.rows[0]?.database !== TEST_DATABASE_NAME) {
      throw new Error('PostgreSQL connected to an unexpected database.');
    }
    // Hold a session lock for the complete run; another test process must fail before cleanup.
    const result = await connection.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [TEST_LOCK_KEY],
    );
    locked = result.rows[0]?.locked === true;
    if (!locked) throw new Error('Another integration test run is already using this database.');
    for (const args of [['generate'], ['migrate', 'deploy']]) {
      try {
        const cli = join(dirname(require.resolve('prisma/package.json')), 'build', 'index.js');
        execFileSync(process.execPath, [cli, ...args], {
          env: { ...process.env, DATABASE_URL: databaseUrl },
          stdio: 'pipe',
          timeout: 60_000,
        });
      } catch (error) {
        const details =
          error && typeof error === 'object' && 'stderr' in error
            ? String(error.stderr).replace(/postgres(?:ql)?:\/\/\S+/g, '[database URL]')
            : 'The Prisma CLI could not be started.';
        throw new Error(
          `Prisma ${args.join(' ')} failed on the exclusive test database. No seed or reset was run.\n${details}`,
        );
      }
    }
  } catch (error) {
    await connection.end();
    throw error;
  }
  return async () => {
    try {
      if (locked) await connection.query('SELECT pg_advisory_unlock($1)', [TEST_LOCK_KEY]);
    } finally {
      await connection.end();
    }
  };
}
