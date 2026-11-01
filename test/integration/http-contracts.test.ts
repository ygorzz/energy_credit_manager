import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { expectRejected } from '../support/assertions.js';
import { expectEnergyIntegrity } from '../support/energy-assertions.js';
import { createEnergyGraph } from '../support/fixtures.js';
import { withRejectedBalanceIncreases } from '../support/postgres.js';
import { api } from '../support/server.js';

const writeRoutes = [
  { method: 'post', path: '/auth/login' },
  { method: 'post', path: '/auth/register' },
  ...[
    'users',
    'distributors',
    'power-plants',
    'client-companies',
    'monthly-generations',
    'credit-allocations',
  ].flatMap((resource) => [
    { method: 'patch', path: `/${resource}/${randomUUID()}` },
    ...(resource === 'users' ? [] : [{ method: 'post', path: `/${resource}` }]),
  ]),
] as { method: 'post' | 'patch'; path: string }[];

// Parser failures happen before authentication and must share the same sanitized JSON contract.
describe.each(writeRoutes)('$method $path parser contract', ({ method, path }) => {
  it('rejects malformed JSON without reflecting the request body', async () => {
    const response = await expectRejected(
      api()[method](path).set('Content-Type', 'application/json').send('{"private-input":'),
      400,
      'Invalid JSON body',
    );
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({ statusCode: 400, message: 'Invalid JSON body' });
    expect(response.text).not.toContain('private-input');
  });
  it('rejects bodies above the real Express JSON size limit', async () => {
    const response = await expectRejected(
      api()
        [method](path)
        .send({ oversized: 'x'.repeat(110_000) }),
      413,
      'Request body is too large',
    );
    expect(response.body).toEqual({ statusCode: 413, message: 'Request body is too large' });
  });
});

describe('Unsupported request encodings', () => {
  it('returns 415 for an unsupported content encoding', async () => {
    await expectRejected(
      api()
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .set('Content-Encoding', 'unsupported')
        .send('{}'),
      415,
      'Unsupported content encoding',
    );
  });
  it('returns 415 for a non-UTF JSON charset', async () => {
    await expectRejected(
      api()
        .post('/auth/login')
        .set('Content-Type', 'application/json; charset=iso-8859-1')
        .send('{}'),
      415,
      'Unsupported character encoding',
    );
  });
});

// Real PostgreSQL triggers fail after earlier writes, including a source-balance debit on movement.
describe('Late persistence errors and transaction rollback', () => {
  it.each(['create', 'move'] as const)(
    'rolls back %s and returns a sanitized 500 response',
    async (operation) => {
      const source = await createEnergyGraph({ withAllocation: operation === 'move' });
      const destination =
        operation === 'move' ? await createEnergyGraph({ withAllocation: false }) : null;
      // Observe only logging; authentication, repositories, services and PostgreSQL stay real.
      const logging = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        await withRejectedBalanceIncreases(async () => {
          const pending =
            operation === 'create'
              ? api()
                  .post('/credit-allocations?trace=private-query')
                  .auth(source.token, { type: 'bearer' })
                  .send({
                    clientCompanyId: source.company.id,
                    year: 2026,
                    month: 'JANUARY',
                    energyAllocatedMwh: 30,
                    password: 'private-input',
                  })
              : api()
                  .patch(`/credit-allocations/${source.allocation?.id}?trace=private-query`)
                  .auth(source.token, { type: 'bearer' })
                  .send({ clientCompanyId: destination?.company.id, password: 'private-input' });
          const response = await expectRejected(pending, 500, 'Internal Server Error');
          expect(response.body).toEqual({ statusCode: 500, message: 'Internal Server Error' });
        });
        expect(logging).toHaveBeenCalledTimes(1);
        const metadata = logging.mock.calls[0]?.[1];
        expect(metadata).toEqual({
          name: expect.any(String),
          method: operation === 'create' ? 'POST' : 'PATCH',
          path:
            operation === 'create'
              ? '/credit-allocations'
              : `/credit-allocations/${source.allocation?.id}`,
        });
        const logs = JSON.stringify(logging.mock.calls);
        for (const secret of [
          'private-input',
          'private-query',
          'integration-only-private-database-detail',
        ])
          expect(logs).not.toContain(secret);
        await expectEnergyIntegrity();
      } finally {
        logging.mockRestore();
      }
    },
  );
});
