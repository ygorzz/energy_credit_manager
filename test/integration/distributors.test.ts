import { describe, expect, it } from 'vitest';
import { expectRejected } from '../support/assertions.js';
import { db } from '../support/database.js';
import { createCompany, createDistributor, createPlant, createUser } from '../support/fixtures.js';
import { describeReadContract, describeWriteValidation } from '../support/route-contracts.js';
import { api } from '../support/server.js';

describeReadContract({
  path: '/distributors',
  patch: { name: 'Updated distributor' },
  seed: async (count) => {
    const records = [];
    for (let index = 0; index < count; index++) records.push(await createDistributor());
    return records;
  },
});

describeWriteValidation({
  path: '/distributors',
  prepare: async () => {
    const auth = await createUser();
    const distributor = await createDistributor();
    return { token: auth.token, id: distributor.id, body: { name: 'New distributor' } };
  },
  required: ['name'],
  invalid: [
    { name: '' },
    { name: '  ' },
    { name: 'A' },
    { name: 'a'.repeat(51) },
    { name: null },
    { name: 123 },
  ],
});

describe('Distributor writes', () => {
  it.each(['Ab', 'x'.repeat(50)])(
    'creates and reads a normalized name at a valid boundary %#',
    async (name) => {
      const auth = await createUser();
      const response = await api()
        .post('/distributors')
        .auth(auth.token, { type: 'bearer' })
        .send({ name: ` ${name} `, unknown: true });
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Distributor created successfully!');
      expect(response.body.created.name).toBe(name.toUpperCase());
      expect(
        await db.distributor.findUniqueOrThrow({ where: { id: response.body.created.id } }),
      ).toEqual(response.body.created);
      const read = await api()
        .get(`/distributors/${response.body.created.id}`)
        .auth(auth.token, { type: 'bearer' });
      expect(read.status).toBe(200);
      expect(read.body).toEqual(response.body.created);
    },
  );
  it('rejects a duplicate normalized name on POST', async () => {
    const auth = await createUser();
    await createDistributor({ name: 'EXISTING DISTRIBUTOR' });
    await expectRejected(
      api()
        .post('/distributors')
        .auth(auth.token, { type: 'bearer' })
        .send({ name: ' existing distributor ' }),
      409,
      'Already exists a distributor with this name',
    );
  });
  it('updates and persists the normalized name', async () => {
    const auth = await createUser();
    const distributor = await createDistributor();
    const response = await api()
      .patch(`/distributors/${distributor.id}`)
      .auth(auth.token, { type: 'bearer' })
      .send({ name: ' updated name ' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      message: 'Distributor updated successfully!',
      updated: { id: distributor.id, name: 'UPDATED NAME' },
    });
    expect((await db.distributor.findUniqueOrThrow({ where: { id: distributor.id } })).name).toBe(
      'UPDATED NAME',
    );
  });
  it('rejects duplicate names on PATCH without overwriting the target', async () => {
    const auth = await createUser();
    const existing = await createDistributor();
    const target = await createDistributor();
    await expectRejected(
      api()
        .patch(`/distributors/${target.id}`)
        .auth(auth.token, { type: 'bearer' })
        .send({ name: existing.name }),
      409,
    );
  });
  it('deletes an unlinked distributor with 200 and returns its previous data', async () => {
    const auth = await createUser();
    const distributor = await createDistributor();
    const response = await api()
      .delete(`/distributors/${distributor.id}`)
      .auth(auth.token, { type: 'bearer' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Distributor deleted successfully!',
      deleted: distributor,
    });
    expect(await db.distributor.findUnique({ where: { id: distributor.id } })).toBeNull();
  });
  // Each relation independently protects ownership and historical monthly balances.
  it.each(['plant', 'company', 'balance'])(
    'rejects deletion with a linked %s',
    async (relation) => {
      const auth = await createUser();
      const distributor = await createDistributor();
      if (relation === 'plant') await createPlant(distributor.id);
      if (relation === 'company') await createCompany(distributor.id);
      if (relation === 'balance')
        await db.monthlyDistributorBalance.create({
          data: {
            distributorId: distributor.id,
            year: 2026,
            month: 'JANUARY',
            avaliableEnergyMwh: 0,
          },
        });
      await expectRejected(
        api().delete(`/distributors/${distributor.id}`).auth(auth.token, { type: 'bearer' }),
        409,
        'Cannot delete a distributor with linked power plants, client companies or monthly balances',
      );
    },
  );
});
