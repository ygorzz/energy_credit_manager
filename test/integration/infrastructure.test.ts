import type { RateLimitRequestHandler } from 'express-rate-limit';
import { Client } from 'pg';
import { describe, expect, inject, it } from 'vitest';
import { getLimiter } from '../../src/middlewares/rate-limit.middleware.js';
import { clearDatabase, db, snapshotDatabase } from '../support/database.js';
import { TEST_LOCK_KEY, validateTestDatabaseUrl } from '../support/environment.js';
import { createDistributor, createUser } from '../support/fixtures.js';
import { clientKey, resetRateLimits } from '../support/rate-limits.js';
import { api } from '../support/server.js';

describe('Integration infrastructure', () => {
  it.each([
    ['missing URL', undefined],
    ['malformed URL', 'invalid'],
    ['wrong provider', 'mysql://test@127.0.0.1/energy_credit_manager_test'],
    ['application database name', 'postgresql://test@127.0.0.1/energy_credit_manager'],
    ['remote host', 'postgresql://test@example.com/energy_credit_manager_test'],
    [
      'database query override',
      'postgresql://test@127.0.0.1/energy_credit_manager_test?database=production',
    ],
    [
      'host query override',
      'postgresql://test@127.0.0.1/energy_credit_manager_test?host=example.com',
    ],
    [
      'different schema',
      'postgresql://test@127.0.0.1/energy_credit_manager_test?schema=production',
    ],
  ])('rejects %s before database operations', (_name, url) => {
    expect(() => validateTestDatabaseUrl(url)).toThrow();
  });

  it('rejects the application destination even with different credentials and loopback spelling', () => {
    expect(() =>
      validateTestDatabaseUrl(
        'postgresql://test:secret@127.0.0.1/energy_credit_manager_test',
        'postgresql://application:another@localhost:5432/energy_credit_manager_test',
      ),
    ).toThrow('must differ');
  });

  it('accepts a dedicated local destination and never prints its credentials in validation errors', () => {
    const url = 'postgresql://test:never-print-this-secret@127.0.0.1/energy_credit_manager_test';
    const accepted = new URL(
      validateTestDatabaseUrl(url, 'postgresql://app@localhost/application'),
    );
    expect(accepted.port).toBe('5432');
    expect(accepted.pathname).toBe('/energy_credit_manager_test');
    try {
      validateTestDatabaseUrl(url.replace('energy_credit_manager_test', 'production'));
      throw new Error('Expected destination rejection');
    } catch (error) {
      expect(String(error)).not.toContain('never-print-this-secret');
      expect(String(error)).toContain('only accept');
    }
  });

  it('holds an exclusive database lock for the complete run', async () => {
    const connection = new Client({ connectionString: inject('testDatabaseUrl') });
    try {
      await connection.connect();
      const result = await connection.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [TEST_LOCK_KEY],
      );
      const locked = result.rows[0]?.locked;
      if (locked) await connection.query('SELECT pg_advisory_unlock($1)', [TEST_LOCK_KEY]);
      expect(locked).toBe(false);
    } finally {
      await connection.end();
    }
  });

  it('clears business records without deleting migration history', async () => {
    const before = await db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "_prisma_migrations"
    `;
    expect(before[0]?.count).toBeGreaterThan(0);
    await createDistributor();
    expect(await db.distributor.count()).toBe(1);
    await clearDatabase();
    const after = await db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "_prisma_migrations"
    `;
    expect(after).toEqual(before);
    for (const records of Object.values(await snapshotDatabase())) expect(records).toHaveLength(0);
  });

  it('runs the actual authentication middleware', async () => {
    const response = await api().get('/distributors');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ statusCode: 401, message: 'No token provided' });
  });

  it('queries an empty list through HTTP using an existing authenticated user', async () => {
    const { token } = await createUser();
    const response = await api().get('/distributors').auth(token, { type: 'bearer' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('resets real rate limit counters between independent scenarios', async () => {
    await api().get('/distributors').expect(401);
    await api().get('/distributors').expect(401);
    const limiter = getLimiter as RateLimitRequestHandler;
    expect((await limiter.getKey(clientKey))?.totalHits).toBe(2);
    await resetRateLimits();
    expect(await limiter.getKey(clientKey)).toBeUndefined();
  });
});
