import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectRejected, expectValidation } from './assertions.js';
import { createUser } from './fixtures.js';
import { api } from './server.js';

type RecordId = { id: string };
type ReadContract = {
  path: string;
  seed: (count: number) => Promise<RecordId[]>;
  patch: Record<string, unknown>;
  includesActor?: boolean;
};

// Shared HTTP contracts remain explicit and independent of production DTO definitions.
export function describeReadContract({ path, seed, patch, includesActor = false }: ReadContract) {
  describe(`${path} read and identifier contracts`, () => {
    it('returns an empty list or only the authenticated user before resource fixtures exist', async () => {
      const auth = await createUser();
      const response = await api().get(path).auth(auth.token, { type: 'bearer' });
      expect(response.status).toBe(200);
      expect(response.body.map((row: RecordId) => row.id)).toEqual(
        includesActor ? [auth.user.id] : [],
      );
    });

    it('uses default page size 10 and stable, non-overlapping ID-ordered pages', async () => {
      const auth = await createUser();
      const records = await seed(12);
      const ids = [
        ...records.map((record) => record.id),
        ...(includesActor ? [auth.user.id] : []),
      ].sort();
      const first = await api().get(path).auth(auth.token, { type: 'bearer' });
      expect(first.status).toBe(200);
      expect(first.body.map((row: RecordId) => row.id)).toEqual(ids.slice(0, 10));
      const second = await api().get(path).query({ page: 2 }).auth(auth.token, { type: 'bearer' });
      expect(second.status).toBe(200);
      expect(second.body.map((row: RecordId) => row.id)).toEqual(ids.slice(10));
      const repeated = await api().get(path).auth(auth.token, { type: 'bearer' });
      expect(repeated.body).toEqual(first.body);
      const small = await api()
        .get(path)
        .query({ page: 2, limit: 3 })
        .auth(auth.token, { type: 'bearer' });
      expect(small.status).toBe(200);
      expect(small.body.map((row: RecordId) => row.id)).toEqual(ids.slice(3, 6));
      const absent = await api()
        .get(path)
        .query({ page: 999 })
        .auth(auth.token, { type: 'bearer' });
      expect(absent.status).toBe(200);
      expect(absent.body).toEqual([]);
    });

    it.each(['ADMIN', 'ANALYST'] as const)(
      'allows %s to list and read a single resource',
      async (role) => {
        const auth = await createUser({ role });
        const [record] = await seed(1);
        const list = await api().get(path).auth(auth.token, { type: 'bearer' });
        expect(list.status).toBe(200);
        expect(list.body).toEqual(
          expect.arrayContaining([expect.objectContaining({ id: record?.id })]),
        );
        const response = await api()
          .get(`${path}/${record?.id}`)
          .auth(auth.token, { type: 'bearer' });
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(record?.id);
      },
    );

    it.each([
      { page: 0 },
      { page: -1 },
      { page: 1.5 },
      { page: 'invalid' },
      { page: '' },
      { limit: 0 },
      { limit: -1 },
      { limit: 11 },
      { limit: 1.5 },
      { limit: 'invalid' },
      { limit: '' },
      { page: [1, 2] },
      { limit: [1, 2] },
    ])('returns Zod 400 for invalid pagination %#', async (query) => {
      const auth = await createUser();
      await expectValidation(
        api().get(path).query(query).auth(auth.token, { type: 'bearer' }),
        Object.keys(query)[0],
      );
    });

    it.each(['get', 'patch', 'delete'] as const)(
      'returns 404 for a missing UUID on %s',
      async (method) => {
        const auth = await createUser();
        const pending = api()
          [method](`${path}/${randomUUID()}`)
          .auth(auth.token, { type: 'bearer' });
        await expectRejected(method === 'patch' ? pending.send(patch) : pending, 404);
      },
    );

    it.each(['get', 'patch', 'delete'] as const)(
      'returns Zod 400 for a malformed UUID on %s',
      async (method) => {
        const auth = await createUser();
        const pending = api()[method](`${path}/invalid`).auth(auth.token, { type: 'bearer' });
        await expectValidation(method === 'patch' ? pending.send(patch) : pending, 'id');
      },
    );
  });
}

type WriteFixture = { token: string; id: string; body: Record<string, unknown> };
type WriteContract = {
  path: string;
  prepare: () => Promise<WriteFixture>;
  invalid: Record<string, unknown>[];
  required?: string[];
  methods?: ('post' | 'patch')[];
};

export function describeWriteValidation({
  path,
  prepare,
  invalid,
  required = [],
  methods = ['post', 'patch'],
}: WriteContract) {
  describe.each(methods)('%s validation', (method) => {
    it.each(invalid)('returns Zod 400 for invalid supported fields %#', async (override) => {
      const fixture = await prepare();
      const pending = api()
        [method](method === 'post' ? path : `${path}/${fixture.id}`)
        .auth(fixture.token, { type: 'bearer' });
      await expectValidation(
        pending.send(method === 'post' ? { ...fixture.body, ...override } : override),
        Object.keys(override)[0],
      );
    });
    it.each([undefined, null, [], 'invalid', 123, {}, { unknown: true }])(
      'rejects an unusable body %#',
      async (body) => {
        const fixture = await prepare();
        const pending = api()
          [method](method === 'post' ? path : `${path}/${fixture.id}`)
          .auth(fixture.token, { type: 'bearer' });
        // Send JSON explicitly so primitive bodies reach the real Express parser.
        const request =
          body === undefined
            ? pending
            : pending.set('Content-Type', 'application/json').send(JSON.stringify(body));
        // Express rejects JSON primitives before controllers; arrays and objects reach Zod.
        if (body === null || typeof body === 'string' || typeof body === 'number') {
          await expectRejected(request, 400, 'Invalid JSON body');
        } else {
          await expectValidation(request);
        }
      },
    );
  });
  if (methods.includes('post'))
    describe('POST required fields', () => {
      it.each(required)('rejects an omitted %s', async (field) => {
        const fixture = await prepare();
        const body = { ...fixture.body };
        delete body[field];
        await expectValidation(
          api().post(path).auth(fixture.token, { type: 'bearer' }).send(body),
          field,
        );
      });
    });
}
