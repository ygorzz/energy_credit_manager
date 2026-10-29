import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { expectRejected, expectValidation } from '../support/assertions.js';
import { db } from '../support/database.js';
import {
  createCompany,
  createDistributor,
  createUser,
  TEST_PASSWORD,
} from '../support/fixtures.js';
import { api } from '../support/server.js';

const registration = {
  name: 'Registered User',
  email: 'registered@example.com',
  password: TEST_PASSWORD,
  role: 'ADMIN',
  companyId: null,
};

describe('POST /auth/login', () => {
  it('returns a signed one-hour token and accepts it on a protected route', async () => {
    const { user } = await createUser();
    const response = await api()
      .post('/auth/login')
      .send({ email: user.email.toLowerCase(), password: TEST_PASSWORD });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User logged successfully!');
    const payload = jwt.verify(response.body.token, env.JWT_SECRET) as jwt.JwtPayload;
    expect(payload).toMatchObject({ id: user.id, role: 'ADMIN' });
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(3600);
    expect((await api().get('/users').auth(response.body.token, { type: 'bearer' })).status).toBe(
      200,
    );
  });

  it.each(['missing user', 'wrong password'])(
    'rejects %s without revealing account existence',
    async (kind) => {
      const { user } = await createUser();
      await expectRejected(
        api()
          .post('/auth/login')
          .send({
            email: kind === 'missing user' ? 'missing@example.com' : user.email,
            password: kind === 'wrong password' ? 'WrongPassword123' : TEST_PASSWORD,
          }),
        401,
        'Invalid email or password',
      );
    },
  );

  it.each(['INACTIVE', 'CANCELED'] as const)(
    'rejects a %s account with correct credentials',
    async (status) => {
      const { user } = await createUser({ status });
      await expectRejected(
        api().post('/auth/login').send({ email: user.email, password: TEST_PASSWORD }),
        403,
      );
    },
  );

  it.each([
    undefined,
    {},
    { email: 'invalid', password: TEST_PASSWORD },
    { email: 'valid@example.com', password: 'abc' },
    { email: 'valid@example.com', password: 'lowercase123' },
    { email: 'valid@example.com', password: 'NoDigits' },
    { email: null, password: 123 },
  ])('returns Zod 400 for invalid login input %#', async (body) => {
    const pending = api().post('/auth/login');
    await expectValidation(body === undefined ? pending : pending.send(body));
  });
});

describe('POST /auth/register', () => {
  it.each(['ADMIN', 'ANALYST', 'CLIENT'] as const)(
    'creates a %s account without exposing password data',
    async (role) => {
      const admin = await createUser();
      const company = await createCompany((await createDistributor()).id);
      const response = await api()
        .post('/auth/register')
        .auth(admin.token, { type: 'bearer' })
        .send({ ...registration, role, companyId: role === 'CLIENT' ? company.id : null });
      expect(response.status).toBe(201);
      expect(response.body.created).toMatchObject({
        email: 'REGISTERED@EXAMPLE.COM',
        role,
        status: 'ACTIVE',
      });
      expect(response.body.created).not.toHaveProperty('password');
      expect(response.body.created).not.toHaveProperty('hashPassword');
      const stored = await db.user.findUniqueOrThrow({ where: { id: response.body.created.id } });
      expect(await bcrypt.compare(TEST_PASSWORD, stored.hashPassword)).toBe(true);
      expect(stored.hashPassword).not.toBe(TEST_PASSWORD);
    },
  );

  it('defaults to CLIENT/ACTIVE and persists the company link', async () => {
    const admin = await createUser();
    const company = await createCompany((await createDistributor()).id);
    const { role: _role, ...body } = registration;
    const response = await api()
      .post('/auth/register')
      .auth(admin.token, { type: 'bearer' })
      .send({ ...body, companyId: company.id });
    expect(response.status).toBe(201);
    expect(response.body.created).toMatchObject({
      role: 'CLIENT',
      status: 'ACTIVE',
      companyId: company.id,
    });
  });

  it('translates duplicate normalized email to 409', async () => {
    const admin = await createUser({ email: registration.email.toUpperCase() });
    await expectRejected(
      api().post('/auth/register').auth(admin.token, { type: 'bearer' }).send(registration),
      409,
      'Already exists a user with this email',
    );
  });

  it('rejects a missing company reference with 404', async () => {
    const admin = await createUser();
    await expectRejected(
      api()
        .post('/auth/register')
        .auth(admin.token, { type: 'bearer' })
        .send({ ...registration, companyId: randomUUID() }),
      404,
      'Client company not found',
    );
  });

  it.each([
    undefined,
    {},
    { name: 'abc' },
    { name: 'x'.repeat(51) },
    { name: null },
    { email: 'invalid' },
    { email: 123 },
    { password: 'abc' },
    { password: 'lowercase123' },
    { password: 'NoDigits' },
    { password: null },
    { role: 'OWNER' },
    { status: 'DELETED' },
    { companyId: 'invalid' },
    { role: 'CLIENT', companyId: null },
    { companyId: undefined },
  ])('returns Zod 400 for invalid registration %#', async (override) => {
    const admin = await createUser();
    const pending = api().post('/auth/register').auth(admin.token, { type: 'bearer' });
    await expectValidation(
      override === undefined
        ? pending
        : pending.send(Object.keys(override).length ? { ...registration, ...override } : {}),
    );
  });
});
