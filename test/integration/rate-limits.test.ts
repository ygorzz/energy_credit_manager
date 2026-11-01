import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { snapshotDatabase } from '../support/database.js';
import { createDistributor, createUser, TEST_PASSWORD } from '../support/fixtures.js';
import { resetRateLimits } from '../support/rate-limits.js';
import { api } from '../support/server.js';

const message = 'Too many requests from this IP. Try again after 1 minute';
const limits = [
  { kind: 'login', maximum: 10 },
  { kind: 'creation', maximum: 20 },
  { kind: 'get', maximum: 60 },
  { kind: 'delete', maximum: 10 },
  { kind: 'update', maximum: 20 },
] as const;

// Exercise exact live quotas without fake clocks, disabled middleware or mocked stores.
describe.each(limits)('$kind limiter: $maximum requests per minute', ({ kind, maximum }) => {
  it('accepts the quota, rejects the next request and shares its counter across resources', async () => {
    const auth = await createUser();
    const target = await createDistributor();
    const deletionTargets: { id: string }[] = [];
    if (kind === 'delete')
      for (let index = 0; index <= maximum; index++)
        deletionTargets.push(await createDistributor());
    const send = (index: number, otherResource = false) => {
      if (kind === 'login')
        return api().post('/auth/login').send({ email: auth.user.email, password: TEST_PASSWORD });
      if (kind === 'creation')
        return api()
          .post(otherResource ? '/auth/register' : '/distributors')
          .auth(auth.token, { type: 'bearer' })
          .send({ name: `RATE TEST ${index}` });
      if (kind === 'get')
        return api()
          .get(otherResource ? '/users' : '/distributors')
          .auth(auth.token, { type: 'bearer' });
      if (kind === 'delete')
        return api()
          .delete(
            otherResource
              ? `/power-plants/${randomUUID()}`
              : `/distributors/${deletionTargets[index]?.id}`,
          )
          .auth(auth.token, { type: 'bearer' });
      return api()
        .patch(otherResource ? `/client-companies/${randomUUID()}` : `/distributors/${target.id}`)
        .auth(auth.token, { type: 'bearer' })
        .send({ name: `UPDATED RATE ${index}` });
    };
    const successStatus = kind === 'creation' ? 201 : 200;
    for (let index = 0; index < maximum; index++) {
      const response = await send(index);
      expect(response.status).toBe(successStatus);
      expect(Number(response.headers['x-ratelimit-limit'])).toBe(maximum);
      expect(Number(response.headers['x-ratelimit-remaining'])).toBe(maximum - index - 1);
    }
    const before = await snapshotDatabase();
    const blocked = await send(maximum, true);
    expect(blocked.status).toBe(429);
    expect(blocked.text).toBe(message);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(blocked.headers['retry-after'])).toBeLessThanOrEqual(60);
    expect(await snapshotDatabase()).toEqual(before);
    // The harness reset isolates cases without changing the application's real quota policy.
    await resetRateLimits();
    const reset = await send(maximum);
    expect(reset.status).toBe(successStatus);
    expect(Number(reset.headers['x-ratelimit-remaining'])).toBe(maximum - 1);
  }, 30_000);
});

describe('Failed authentication still consumes request quotas', () => {
  it('limits incorrect login attempts before accepting another password check', async () => {
    const auth = await createUser();
    const before = await snapshotDatabase();
    for (let index = 0; index < 10; index++)
      expect(
        (
          await api()
            .post('/auth/login')
            .send({ email: auth.user.email, password: 'WrongPassword123' })
        ).status,
      ).toBe(401);
    expect(
      (await api().post('/auth/login').send({ email: auth.user.email, password: TEST_PASSWORD }))
        .status,
    ).toBe(429);
    expect(await snapshotDatabase()).toEqual(before);
  }, 30_000);
  it('counts unauthenticated GET attempts in the same IP quota as authenticated requests', async () => {
    const auth = await createUser();
    const before = await snapshotDatabase();
    for (let index = 0; index < 60; index++)
      expect((await api().get('/distributors')).status).toBe(401);
    expect((await api().get('/users').auth(auth.token, { type: 'bearer' })).status).toBe(429);
    expect(await snapshotDatabase()).toEqual(before);
  }, 30_000);
});
