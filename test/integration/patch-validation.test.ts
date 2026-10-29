import { describe, expect, it } from 'vitest';
import { db, snapshotDatabase } from '../support/database.js';
import { createEnergyGraph } from '../support/fixtures.js';
import { api } from '../support/server.js';

const cases = [
  { resource: 'users', field: 'user', invalid: { name: 123 } },
  { resource: 'distributors', field: 'distributor', invalid: { name: 123 } },
  { resource: 'power-plants', field: 'plant', invalid: { status: 'INVALID' } },
  { resource: 'client-companies', field: 'company', invalid: { allocationPercentage: -1 } },
  { resource: 'monthly-generations', field: 'generation', invalid: { energyGeneratedMwh: -1 } },
  { resource: 'credit-allocations', field: 'allocation', invalid: { energyAllocatedMwh: -1 } },
] as const;
const emptyMessage = 'At least one field must be provided for update';

describe.each(cases)('PATCH /$resource/:id prerequisite', ({ resource, field, invalid }) => {
  it.each(['empty object', 'missing body', 'unknown fields only'])(
    'rejects %s without writing data',
    async (kind) => {
      const graph = await createEnergyGraph();
      const target = graph[field];
      if (!target) throw new Error('The fixture must include the target record.');
      const before = await snapshotDatabase();
      const pending = api()
        .patch(`/${resource}/${target.id}`)
        .auth(graph.token, { type: 'bearer' });
      const response = await (kind === 'missing body'
        ? pending
        : pending.send(kind === 'empty object' ? {} : { unknownField: 'ignored' }));
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ statusCode: 400, message: 'Validation Error' });
      expect(response.body.errors).toBeInstanceOf(Array);
      if (kind !== 'missing body') {
        expect(response.body.errors).toEqual([{ code: 'custom', path: [], message: emptyMessage }]);
      }
      expect(await snapshotDatabase()).toEqual(before);
    },
  );

  it('returns the standard Zod 400 response for invalid supported data', async () => {
    const graph = await createEnergyGraph();
    const target = graph[field];
    if (!target) throw new Error('The fixture must include the target record.');
    const before = await snapshotDatabase();
    const response = await api()
      .patch(`/${resource}/${target.id}`)
      .auth(graph.token, { type: 'bearer' })
      .send(invalid);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ statusCode: 400, message: 'Validation Error' });
    expect(response.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: [Object.keys(invalid)[0]] })]),
    );
    expect(await snapshotDatabase()).toEqual(before);
  });

  it.each(['get', 'patch', 'delete'] as const)(
    'rejects an invalid UUID on %s without writing data',
    async (method) => {
      const graph = await createEnergyGraph();
      const before = await snapshotDatabase();
      const pending = api()
        [method](`/${resource}/invalid-uuid`)
        .auth(graph.token, { type: 'bearer' });
      const response = await (method === 'patch' ? pending.send({}) : pending);
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ statusCode: 400, message: 'Validation Error' });
      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['id'] })]),
      );
      expect(await snapshotDatabase()).toEqual(before);
    },
  );
});

describe('Valid partial updates', () => {
  it.each(['INACTIVE', 'MAINTENANCE'] as const)(
    'preserves omitted plant status %s',
    async (status) => {
      const graph = await createEnergyGraph();
      await db.powerPlant.update({ where: { id: graph.plant.id }, data: { status } });
      const response = await api()
        .patch(`/power-plants/${graph.plant.id}`)
        .auth(graph.token, { type: 'bearer' })
        .send({ name: 'Updated plant', unknownField: 'ignored' });
      expect(response.status).toBe(200);
      expect(response.body.updated).toMatchObject({
        id: graph.plant.id,
        name: 'UPDATED PLANT',
        status,
      });
      expect(
        await db.powerPlant.findUniqueOrThrow({ where: { id: graph.plant.id } }),
      ).toMatchObject({ name: 'UPDATED PLANT', status });
    },
  );

  it('retains the ACTIVE default when creating a plant', async () => {
    const graph = await createEnergyGraph();
    const response = await api().post('/power-plants').auth(graph.token, { type: 'bearer' }).send({
      name: 'New plant',
      state: 'SP',
      city: 'Test city',
      sourceType: 'SOLAR',
      installedCapacityMw: 1,
      distributorId: graph.distributor.id,
    });
    expect(response.status).toBe(201);
    expect(response.body.created.status).toBe('ACTIVE');
    expect(
      (await db.powerPlant.findUniqueOrThrow({ where: { id: response.body.created.id } })).status,
    ).toBe('ACTIVE');
  });

  it('accepts zero as a company allocation percentage', async () => {
    const graph = await createEnergyGraph();
    const response = await api()
      .patch(`/client-companies/${graph.company.id}`)
      .auth(graph.token, { type: 'bearer' })
      .send({ allocationPercentage: 0 });
    expect(response.status).toBe(200);
    expect(response.body.updated.allocationPercentage).toBe(0);
    expect(
      (await db.clientCompany.findUniqueOrThrow({ where: { id: graph.company.id } }))
        .allocationPercentage,
    ).toBe(0);
  });

  it('accepts zero generation and updates the unallocated balance', async () => {
    const graph = await createEnergyGraph({ withAllocation: false });
    const response = await api()
      .patch(`/monthly-generations/${graph.generation.id}`)
      .auth(graph.token, { type: 'bearer' })
      .send({ energyGeneratedMwh: 0 });
    expect(response.status).toBe(200);
    expect(response.body.updated.energyGeneratedMwh).toBe('0');
    const balance = await db.monthlyDistributorBalance.findUniqueOrThrow({
      where: { id: graph.balance.id },
    });
    expect(balance.totalEnergyGeneratedMwh.toString()).toBe('0');
    expect(balance.totalEnergyAllocatedMwh.toString()).toBe('0');
    expect(balance.avaliableEnergyMwh.toString()).toBe('0');
  });

  it('accepts zero allocation and percentage and returns the energy to the balance', async () => {
    const graph = await createEnergyGraph();
    if (!graph.allocation) throw new Error('Expected an allocation fixture.');
    const response = await api()
      .patch(`/credit-allocations/${graph.allocation.id}`)
      .auth(graph.token, { type: 'bearer' })
      .send({ energyAllocatedMwh: 0, percentageApplied: 0 });
    expect(response.status).toBe(200);
    expect(response.body.updated).toMatchObject({
      energyAllocatedMwh: '0',
      percentageApplied: '0',
    });
    const balance = await db.monthlyDistributorBalance.findUniqueOrThrow({
      where: { id: graph.balance.id },
    });
    expect(balance.totalEnergyAllocatedMwh.toString()).toBe('0');
    expect(balance.avaliableEnergyMwh.toString()).toBe('100');
  });

  it('accepts null to request the current company percentage', async () => {
    const graph = await createEnergyGraph();
    if (!graph.allocation) throw new Error('Expected an allocation fixture.');
    await db.clientCompany.update({
      where: { id: graph.company.id },
      data: { allocationPercentage: 40 },
    });
    const response = await api()
      .patch(`/credit-allocations/${graph.allocation.id}`)
      .auth(graph.token, { type: 'bearer' })
      .send({ energyAllocatedMwh: 40, percentageApplied: null });
    expect(response.status).toBe(200);
    expect(response.body.updated).toMatchObject({
      energyAllocatedMwh: '40',
      percentageApplied: '40',
    });
    const balance = await db.monthlyDistributorBalance.findUniqueOrThrow({
      where: { id: graph.balance.id },
    });
    expect(balance.totalEnergyAllocatedMwh.toString()).toBe('40');
    expect(balance.avaliableEnergyMwh.toString()).toBe('60');
  });

  it('accepts null to unlink an ADMIN user from a company', async () => {
    const graph = await createEnergyGraph();
    const response = await api()
      .patch(`/users/${graph.user.id}`)
      .auth(graph.token, { type: 'bearer' })
      .send({ companyId: null });
    expect(response.status).toBe(200);
    expect(response.body.updated).toMatchObject({
      id: graph.user.id,
      role: 'ADMIN',
      companyId: null,
    });
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: graph.user.id } })).companyId,
    ).toBeNull();
  });
});
