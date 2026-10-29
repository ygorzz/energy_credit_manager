import type { Response } from 'supertest';
import { expect } from 'vitest';
import { snapshotDatabase } from './database.js';

// Rejected HTTP operations must preserve every business table, including energy balances.
export async function expectRejected(
  pending: PromiseLike<Response>,
  status: number,
  message?: string,
) {
  const before = await snapshotDatabase();
  const response = await pending;
  expect(response.status).toBe(status);
  expect(response.body).toMatchObject({ statusCode: status });
  if (message) expect(response.body.message).toBe(message);
  expect(await snapshotDatabase()).toEqual(before);
  return response;
}

export async function expectValidation(pending: PromiseLike<Response>, field?: string) {
  const response = await expectRejected(pending, 400, 'Validation Error');
  expect(response.body.errors).toBeInstanceOf(Array);
  expect(response.body.errors.length).toBeGreaterThan(0);
  if (field) {
    expect(response.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: [field] })]),
    );
  }
  return response;
}
