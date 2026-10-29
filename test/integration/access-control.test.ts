import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { describe, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { expectRejected } from '../support/assertions.js';
import { db } from '../support/database.js';
import { createUser } from '../support/fixtures.js';
import { api } from '../support/server.js';

const resources = [
  'users',
  'distributors',
  'power-plants',
  'client-companies',
  'monthly-generations',
  'credit-allocations',
];
// Explicit access contract: CLIENT has no access yet; ANALYST writes allocations only via POST.
const routes = [
  { method: 'post', path: '/auth/register', analyst: false },
  ...resources.flatMap((resource) => [
    { method: 'get', path: `/${resource}`, analyst: true },
    { method: 'get', path: `/${resource}/${randomUUID()}`, analyst: true },
    { method: 'patch', path: `/${resource}/${randomUUID()}`, analyst: false },
    { method: 'delete', path: `/${resource}/${randomUUID()}`, analyst: false },
    ...(resource === 'users'
      ? []
      : [{ method: 'post', path: `/${resource}`, analyst: resource === 'credit-allocations' }]),
  ]),
] as { method: 'get' | 'post' | 'patch' | 'delete'; path: string; analyst: boolean }[];

// Missing resource IDs are intentional: authentication and authorization must reject first.
describe.each(routes)('$method $path access', ({ method, path, analyst }) => {
  it.each([
    'missing',
    'invalid signature',
    'expired',
    'wrong scheme',
    'invalid claims',
    'removed',
    'inactive',
    'canceled',
  ])('rejects %s credentials before accessing resource data', async (kind) => {
    const auth = await createUser();
    let token = auth.token;
    if (kind === 'invalid signature')
      token = jwt.sign({ id: auth.user.id, role: 'ADMIN' }, 'different-secret');
    if (kind === 'expired')
      token = jwt.sign({ id: auth.user.id, role: 'ADMIN' }, env.JWT_SECRET, { expiresIn: -1 });
    if (kind === 'invalid claims')
      token = jwt.sign({ id: 'not-a-uuid', role: 'ADMIN' }, env.JWT_SECRET);
    if (kind === 'removed') await db.user.delete({ where: { id: auth.user.id } });
    if (kind === 'inactive' || kind === 'canceled')
      await db.user.update({
        where: { id: auth.user.id },
        data: { status: kind === 'inactive' ? 'INACTIVE' : 'CANCELED' },
      });
    const pending = api()[method](path);
    if (kind !== 'missing')
      pending.set('Authorization', `${kind === 'wrong scheme' ? 'Basic' : 'Bearer'} ${token}`);
    await expectRejected(pending, kind === 'inactive' || kind === 'canceled' ? 403 : 401);
  });

  it('rejects CLIENT with no data exposure or mutation', async () => {
    const auth = await createUser({ role: 'CLIENT' });
    await expectRejected(api()[method](path).auth(auth.token, { type: 'bearer' }), 403);
  });

  if (!analyst)
    it('rejects ANALYST on administrator-only operations', async () => {
      const auth = await createUser({ role: 'ANALYST' });
      await expectRejected(api()[method](path).auth(auth.token, { type: 'bearer' }), 403);
    });
});

// A valid signature alone is insufficient; claims and the account's current role must remain valid.
describe('JWT payload and current database role', () => {
  it.each([
    { role: 'ADMIN' },
    { id: randomUUID() },
    { id: randomUUID(), role: 'OWNER' },
    { id: 123, role: 'ADMIN' },
  ])('rejects a signed payload with invalid claims %#', async (claims) => {
    await expectRejected(
      api().get('/users').auth(jwt.sign(claims, env.JWT_SECRET), { type: 'bearer' }),
      401,
      'Invalid token payload',
    );
  });
  it.each(['Basic token', 'Bearer', 'Bearer token extra'])(
    'rejects malformed header %s',
    async (header) => {
      await expectRejected(
        api().get('/users').set('Authorization', header),
        401,
        'Malformed token',
      );
    },
  );
  it('uses the current role after a token was issued', async () => {
    const auth = await createUser();
    await db.user.update({ where: { id: auth.user.id }, data: { role: 'CLIENT' } });
    await expectRejected(api().get('/users').auth(auth.token, { type: 'bearer' }), 403);
  });
  it('accepts a case-insensitive Bearer scheme with a current ADMIN role', async () => {
    const auth = await createUser({ role: 'ANALYST' });
    await db.user.update({ where: { id: auth.user.id }, data: { role: 'ADMIN' } });
    const response = await api().get('/users').set('Authorization', `bEaReR ${auth.token}`);
    if (response.status !== 200)
      throw new Error(`Expected current ADMIN access, got ${response.status}`);
  });
});
