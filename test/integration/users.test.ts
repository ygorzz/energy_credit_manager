import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';
import { expectRejected } from '../support/assertions.js';
import { db } from '../support/database.js';
import { createCompany, createDistributor, createUser } from '../support/fixtures.js';
import { describeReadContract, describeWriteValidation } from '../support/route-contracts.js';
import { api } from '../support/server.js';

describeReadContract({
  path: '/users',
  includesActor: true,
  patch: { name: 'Updated user' },
  seed: async (count) => {
    const users = [];
    for (let index = 0; index < count; index++) users.push((await createUser()).user);
    return users;
  },
});

describeWriteValidation({
  path: '/users',
  methods: ['patch'],
  prepare: async () => {
    const auth = await createUser();
    const target = await createUser();
    return { token: auth.token, id: target.user.id, body: {} };
  },
  invalid: [
    { name: '' },
    { name: 'abc' },
    { name: 'a'.repeat(51) },
    { name: null },
    { name: 123 },
    { email: 'invalid' },
    { email: null },
    { password: 'abc' },
    { password: 'lowercase123' },
    { password: 'NoDigits' },
    { password: null },
    { role: 'OWNER' },
    { role: null },
    { status: 'DELETED' },
    { status: null },
    { companyId: 'invalid' },
    { companyId: 123 },
  ],
});

describe('User update and deletion', () => {
  it('preserves omitted role/status/password/company and never exposes password fields', async () => {
    const auth = await createUser();
    const company = await createCompany((await createDistributor()).id);
    const target = await createUser({ role: 'CLIENT', status: 'INACTIVE', companyId: company.id });
    const before = await db.user.findUniqueOrThrow({ where: { id: target.user.id } });
    const updated = await api()
      .patch(`/users/${target.user.id}`)
      .auth(auth.token, { type: 'bearer' })
      .send({ name: 'Updated user', unknown: 'ignored' });
    expect(updated.status).toBe(200);
    expect(updated.body.message).toBe('User updated successfully!');
    expect(updated.body.updated).toMatchObject({
      name: 'Updated user',
      role: 'CLIENT',
      status: 'INACTIVE',
      companyId: company.id,
    });
    const stored = await db.user.findUniqueOrThrow({ where: { id: target.user.id } });
    expect(stored.hashPassword).toBe(before.hashPassword);
    const responses = [
      updated.body.updated,
      (await api().get(`/users/${target.user.id}`).auth(auth.token, { type: 'bearer' })).body,
      ...(await api().get('/users').auth(auth.token, { type: 'bearer' })).body,
    ];
    for (const response of responses) {
      expect(response).not.toHaveProperty('password');
      expect(response).not.toHaveProperty('hashPassword');
    }
  });
  it('hashes a replacement password and logs in with the new credentials', async () => {
    const auth = await createUser();
    const target = await createUser();
    const response = await api()
      .patch(`/users/${target.user.id}`)
      .auth(auth.token, { type: 'bearer' })
      .send({ password: 'NewPassword456', email: 'new@example.com' });
    expect(response.status).toBe(200);
    const stored = await db.user.findUniqueOrThrow({ where: { id: target.user.id } });
    expect(stored.email).toBe('NEW@EXAMPLE.COM');
    expect(await bcrypt.compare('NewPassword456', stored.hashPassword)).toBe(true);
    expect(
      (
        await api()
          .post('/auth/login')
          .send({ email: 'new@example.com', password: 'NewPassword456' })
      ).status,
    ).toBe(200);
  });
  it('rejects duplicate email with 409 and rolls back other fields', async () => {
    const auth = await createUser();
    const target = await createUser();
    await expectRejected(
      api()
        .patch(`/users/${target.user.id}`)
        .auth(auth.token, { type: 'bearer' })
        .send({ email: auth.user.email.toLowerCase(), name: 'Should not persist' }),
      409,
    );
  });
  it('rejects an unknown company with 404', async () => {
    const auth = await createUser();
    await expectRejected(
      api()
        .patch(`/users/${auth.user.id}`)
        .auth(auth.token, { type: 'bearer' })
        .send({ companyId: randomUUID() }),
      404,
      'Client company not found',
    );
  });
  it.each(['become client without a company', 'unlink existing client'])(
    'rejects %s using effective PATCH values',
    async (kind) => {
      const auth = await createUser();
      const company = await createCompany((await createDistributor()).id);
      const target = await createUser(
        kind === 'unlink existing client' ? { role: 'CLIENT', companyId: company.id } : {},
      );
      await expectRejected(
        api()
          .patch(`/users/${target.user.id}`)
          .auth(auth.token, { type: 'bearer' })
          .send(kind === 'unlink existing client' ? { companyId: null } : { role: 'CLIENT' }),
        400,
        'A client user must be linked to a company',
      );
    },
  );
  it('changes role and company together and permits unlinking a promoted CLIENT', async () => {
    const auth = await createUser();
    const target = await createUser();
    const company = await createCompany((await createDistributor()).id);
    const linked = await api()
      .patch(`/users/${target.user.id}`)
      .auth(auth.token, { type: 'bearer' })
      .send({ role: 'CLIENT', companyId: company.id });
    expect(linked.status).toBe(200);
    expect(linked.body.updated).toMatchObject({ role: 'CLIENT', companyId: company.id });
    const promoted = await api()
      .patch(`/users/${target.user.id}`)
      .auth(auth.token, { type: 'bearer' })
      .send({ role: 'ANALYST', companyId: null, status: 'CANCELED' });
    expect(promoted.status).toBe(200);
    expect(await db.user.findUniqueOrThrow({ where: { id: target.user.id } })).toMatchObject({
      role: 'ANALYST',
      companyId: null,
      status: 'CANCELED',
    });
  });
  it('deletes a user with 200 and returns the deleted public record', async () => {
    const auth = await createUser();
    const target = await createUser();
    const response = await api()
      .delete(`/users/${target.user.id}`)
      .auth(auth.token, { type: 'bearer' });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User deleted successfully!');
    expect(response.body.deleted.id).toBe(target.user.id);
    expect(response.body.deleted).not.toHaveProperty('hashPassword');
    expect(await db.user.findUnique({ where: { id: target.user.id } })).toBeNull();
    await expectRejected(
      api().delete(`/users/${target.user.id}`).auth(auth.token, { type: 'bearer' }),
      404,
    );
  });
});
