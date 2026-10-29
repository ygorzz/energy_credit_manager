import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectRejected } from '../support/assertions.js';
import { db } from '../support/database.js';
import {
  createDistributor,
  createEnergyGraph,
  createPlant,
  createUser,
} from '../support/fixtures.js';
import { describeReadContract, describeWriteValidation } from '../support/route-contracts.js';
import { api } from '../support/server.js';

const plantInput = (distributorId: string) => ({
  name: 'New plant',
  state: 'SP',
  city: 'Test city',
  sourceType: 'SOLAR',
  installedCapacityMw: 1.25,
  distributorId,
});

describeReadContract({
  path: '/power-plants',
  patch: { name: 'Updated plant' },
  seed: async (count) => {
    const distributor = await createDistributor();
    const records = [];
    for (let index = 0; index < count; index++) records.push(await createPlant(distributor.id));
    return records;
  },
});

describeWriteValidation({
  path: '/power-plants',
  prepare: async () => {
    const auth = await createUser();
    const distributor = await createDistributor();
    const plant = await createPlant(distributor.id);
    return { token: auth.token, id: plant.id, body: plantInput(distributor.id) };
  },
  required: ['name', 'state', 'city', 'sourceType', 'installedCapacityMw', 'distributorId'],
  invalid: [
    { name: '' },
    { name: ' ' },
    { name: 'A' },
    { name: 'a'.repeat(101) },
    { name: null },
    { name: 123 },
    { city: 'A' },
    { city: '  ' },
    { city: 'a'.repeat(101) },
    { city: null },
    { city: 123 },
    { state: 'XX' },
    { state: null },
    { sourceType: 'NUCLEAR' },
    { sourceType: null },
    { status: 'CANCELED' },
    { status: null },
    { installedCapacityMw: 0 },
    { installedCapacityMw: -1 },
    { installedCapacityMw: '1' },
    { installedCapacityMw: null },
    { distributorId: 'invalid' },
    { distributorId: null },
  ],
});

// Cadastral edits must preserve generation ownership and the plant's existing operational state.
describe('Power plant writes', () => {
  it.each(['SOLAR', 'HYDRO', 'WIND'])(
    'creates and reads a %s plant with ACTIVE default and decimal capacity',
    async (sourceType) => {
      const auth = await createUser();
      const distributor = await createDistributor();
      const response = await api()
        .post('/power-plants')
        .auth(auth.token, { type: 'bearer' })
        .send({
          ...plantInput(distributor.id),
          name: ' normalized plant ',
          city: ' Trimmed city ',
          sourceType,
          unknown: true,
        });
      expect(response.status).toBe(201);
      expect(response.body.created).toMatchObject({
        name: 'NORMALIZED PLANT',
        city: 'Trimmed city',
        sourceType,
        status: 'ACTIVE',
        installedCapacityMw: '1.25',
      });
      expect(
        (
          await db.powerPlant.findUniqueOrThrow({ where: { id: response.body.created.id } })
        ).installedCapacityMw.toString(),
      ).toBe('1.25');
      const read = await api()
        .get(`/power-plants/${response.body.created.id}`)
        .auth(auth.token, { type: 'bearer' });
      expect(read.status).toBe(200);
      expect(read.body).toEqual(response.body.created);
    },
  );
  it.each(['post', 'patch'] as const)('rejects a nonexistent distributor on %s', async (method) => {
    const auth = await createUser();
    const plant = await createPlant((await createDistributor()).id);
    await expectRejected(
      api()
        [method](method === 'post' ? '/power-plants' : `/power-plants/${plant.id}`)
        .auth(auth.token, { type: 'bearer' })
        .send(method === 'post' ? plantInput(randomUUID()) : { distributorId: randomUUID() }),
      404,
    );
  });
  it.each(['post', 'patch'] as const)(
    'rejects duplicate normalized names on %s',
    async (method) => {
      const auth = await createUser();
      const distributor = await createDistributor();
      const existing = await createPlant(distributor.id);
      const target = await createPlant(distributor.id);
      await expectRejected(
        api()
          [method](method === 'post' ? '/power-plants' : `/power-plants/${target.id}`)
          .auth(auth.token, { type: 'bearer' })
          .send(
            method === 'post'
              ? { ...plantInput(distributor.id), name: existing.name.toLowerCase() }
              : { name: existing.name.toLowerCase() },
          ),
        409,
      );
    },
  );
  it('updates all mutable fields and changes distributor when there is no generation history', async () => {
    const auth = await createUser();
    const plant = await createPlant((await createDistributor()).id);
    const distributor = await createDistributor();
    const response = await api()
      .patch(`/power-plants/${plant.id}`)
      .auth(auth.token, { type: 'bearer' })
      .send({
        name: ' Updated plant ',
        state: 'MG',
        city: ' New city ',
        sourceType: 'WIND',
        installedCapacityMw: 2.75,
        status: 'MAINTENANCE',
        distributorId: distributor.id,
      });
    expect(response.status).toBe(200);
    expect(response.body.updated).toMatchObject({
      name: 'UPDATED PLANT',
      state: 'MG',
      city: 'New city',
      sourceType: 'WIND',
      installedCapacityMw: '2.75',
      status: 'MAINTENANCE',
      distributorId: distributor.id,
    });
    const stored = await db.powerPlant.findUniqueOrThrow({ where: { id: plant.id } });
    expect(stored).toMatchObject({
      name: 'UPDATED PLANT',
      distributorId: distributor.id,
      status: 'MAINTENANCE',
    });
  });
  // Historical generation ownership cannot move through a cadastral PATCH.
  it('rejects distributor changes with generation history and rolls back accompanying edits', async () => {
    const graph = await createEnergyGraph();
    const distributor = await createDistributor();
    await expectRejected(
      api()
        .patch(`/power-plants/${graph.plant.id}`)
        .auth(graph.token, { type: 'bearer' })
        .send({ distributorId: distributor.id, name: 'Must not persist' }),
      409,
      'Cannot change distributor of a power plant with generation history',
    );
  });
  it('allows the same distributor and name-only updates with history without changing balances', async () => {
    const graph = await createEnergyGraph();
    const response = await api()
      .patch(`/power-plants/${graph.plant.id}`)
      .auth(graph.token, { type: 'bearer' })
      .send({ distributorId: graph.distributor.id, name: 'Updated with history' });
    expect(response.status).toBe(200);
    expect(response.body.updated.name).toBe('UPDATED WITH HISTORY');
    expect(
      await db.monthlyDistributorBalance.findUniqueOrThrow({ where: { id: graph.balance.id } }),
    ).toEqual(graph.balance);
  });
  it('deletes an unlinked plant and returns 200 with deleted data', async () => {
    const auth = await createUser();
    const plant = await createPlant((await createDistributor()).id);
    const response = await api()
      .delete(`/power-plants/${plant.id}`)
      .auth(auth.token, { type: 'bearer' });
    expect(response.status).toBe(200);
    expect(response.body.deleted.id).toBe(plant.id);
    expect(await db.powerPlant.findUnique({ where: { id: plant.id } })).toBeNull();
  });
  it('rejects deletion of a plant with generation history', async () => {
    const graph = await createEnergyGraph();
    await expectRejected(
      api().delete(`/power-plants/${graph.plant.id}`).auth(graph.token, { type: 'bearer' }),
      409,
      'Cannot delete a power plant with generation history',
    );
  });
});
