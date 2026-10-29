import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectRejected } from '../support/assertions.js';
import { db } from '../support/database.js';
import { expectBalance, expectEnergyIntegrity } from '../support/energy-assertions.js';
import {
  createDistributor,
  createEnergyGraph,
  createPlant,
  createUser,
} from '../support/fixtures.js';
import { describeReadContract, describeWriteValidation } from '../support/route-contracts.js';
import { api } from '../support/server.js';

const generationInput = (powerPlantId: string) => ({
  powerPlantId,
  month: 'JANUARY',
  year: 2026,
  energyGeneratedMwh: 100,
});

describeReadContract({
  path: '/monthly-generations',
  patch: { energyGeneratedMwh: 10 },
  seed: async (count) => {
    const records = [];
    for (let index = 0; index < count; index++)
      records.push((await createEnergyGraph({ withAllocation: false })).generation);
    return records;
  },
});

describeWriteValidation({
  path: '/monthly-generations',
  prepare: async () => {
    const graph = await createEnergyGraph({ withAllocation: false });
    return {
      token: graph.token,
      id: graph.generation.id,
      body: { ...generationInput(graph.plant.id), month: 'FEBRUARY' },
    };
  },
  required: ['powerPlantId', 'month', 'year', 'energyGeneratedMwh'],
  invalid: [
    { month: 'INVALID' },
    { month: null },
    { month: 1 },
    { year: 1999 },
    { year: 2101 },
    { year: 2026.5 },
    { year: '2026' },
    { year: null },
    { energyGeneratedMwh: -1 },
    { energyGeneratedMwh: '100' },
    { energyGeneratedMwh: null },
    { powerPlantId: 'invalid' },
    { powerPlantId: null },
  ],
});

describe('Monthly generation writes and balances', () => {
  it.each([0, 0.1, 100])(
    'creates generation %s and its monthly balance atomically',
    async (energyGeneratedMwh) => {
      const auth = await createUser();
      const distributor = await createDistributor();
      const plant = await createPlant(distributor.id);
      const response = await api()
        .post('/monthly-generations')
        .auth(auth.token, { type: 'bearer' })
        .send({ ...generationInput(plant.id), energyGeneratedMwh, unknown: true });
      expect(response.status).toBe(201);
      expect(response.body.created).toMatchObject({
        ...generationInput(plant.id),
        energyGeneratedMwh: String(energyGeneratedMwh),
      });
      expect(
        (
          await db.monthlyGeneration.findUniqueOrThrow({ where: { id: response.body.created.id } })
        ).energyGeneratedMwh.toString(),
      ).toBe(String(energyGeneratedMwh));
      await expectBalance(distributor.id, [
        String(energyGeneratedMwh),
        '0',
        String(energyGeneratedMwh),
      ]);
      await expectEnergyIntegrity();
    },
  );
  it.each([2000, 2100])('accepts year boundary %s', async (year) => {
    const auth = await createUser();
    const plant = await createPlant((await createDistributor()).id);
    const response = await api()
      .post('/monthly-generations')
      .auth(auth.token, { type: 'bearer' })
      .send({ ...generationInput(plant.id), year });
    expect(response.status).toBe(201);
    expect(response.body.created.year).toBe(year);
    await expectEnergyIntegrity();
  });
  it('adds two plant generations to one distributor without binary floating-point drift', async () => {
    const auth = await createUser();
    const distributor = await createDistributor();
    for (const energy of [0.1, 0.2]) {
      const plant = await createPlant(distributor.id);
      expect(
        (
          await api()
            .post('/monthly-generations')
            .auth(auth.token, { type: 'bearer' })
            .send({ ...generationInput(plant.id), energyGeneratedMwh: energy })
        ).status,
      ).toBe(201);
    }
    await expectBalance(distributor.id, ['0.3', '0', '0.3']);
    await expectEnergyIntegrity();
  });
  it.each(['post', 'patch'] as const)(
    'rejects a missing plant on %s without balance changes',
    async (method) => {
      const graph = await createEnergyGraph({ withAllocation: false });
      await expectRejected(
        api()
          [method](
            method === 'post'
              ? '/monthly-generations'
              : `/monthly-generations/${graph.generation.id}`,
          )
          .auth(graph.token, { type: 'bearer' })
          .send(method === 'post' ? generationInput(randomUUID()) : { powerPlantId: randomUUID() }),
        404,
        'Power plant id not found',
      );
    },
  );
  it('rejects duplicate plant/month/year and preserves the balance', async () => {
    const graph = await createEnergyGraph();
    await expectRejected(
      api()
        .post('/monthly-generations')
        .auth(graph.token, { type: 'bearer' })
        .send(generationInput(graph.plant.id)),
      409,
      'Monthly generation already exists',
    );
    await expectEnergyIntegrity();
  });
  it.each([150, 30, 100])(
    'updates generated energy to %s and returns the persisted record',
    async (energyGeneratedMwh) => {
      const graph = await createEnergyGraph();
      const response = await api()
        .patch(`/monthly-generations/${graph.generation.id}`)
        .auth(graph.token, { type: 'bearer' })
        .send({ energyGeneratedMwh });
      expect(response.status).toBe(200);
      expect(response.body.updated).toMatchObject({
        id: graph.generation.id,
        energyGeneratedMwh: String(energyGeneratedMwh),
      });
      await expectBalance(graph.distributor.id, [
        String(energyGeneratedMwh),
        '30',
        String(energyGeneratedMwh - 30),
      ]);
      // Corrections preserve historical percentages; redefining that rule remains decision D01.
      expect((await db.creditAllocation.findFirstOrThrow()).percentageApplied.toString()).toBe(
        '30',
      );
      await expectEnergyIntegrity();
    },
  );
  it('rejects a reduction below allocated energy', async () => {
    const graph = await createEnergyGraph();
    await expectRejected(
      api()
        .patch(`/monthly-generations/${graph.generation.id}`)
        .auth(graph.token, { type: 'bearer' })
        .send({ energyGeneratedMwh: 29 }),
      400,
      'Cannot reduce generation below the energy already allocated.',
    );
  });
  it.each(['month', 'year', 'distributor', 'same distributor plant'])(
    'moves generation by %s and updates source/destination balances',
    async (kind) => {
      const graph = await createEnergyGraph({ withAllocation: false });
      const targetDistributor =
        kind === 'distributor' ? await createDistributor() : graph.distributor;
      const targetPlant =
        kind.includes('plant') || kind === 'distributor'
          ? await createPlant(targetDistributor.id)
          : graph.plant;
      const month = kind === 'month' ? 'FEBRUARY' : 'JANUARY';
      const year = kind === 'year' ? 2027 : 2026;
      const response = await api()
        .patch(`/monthly-generations/${graph.generation.id}`)
        .auth(graph.token, { type: 'bearer' })
        .send({ powerPlantId: targetPlant.id, month, year, energyGeneratedMwh: 125 });
      expect(response.status).toBe(200);
      expect(response.body.updated).toMatchObject({
        id: graph.generation.id,
        powerPlantId: targetPlant.id,
        month,
        year,
        energyGeneratedMwh: '125',
      });
      if (kind !== 'same distributor plant')
        await expectBalance(graph.distributor.id, ['0', '0', '0']);
      await expectBalance(targetDistributor.id, ['125', '0', '125'], month, year);
      await expectEnergyIntegrity();
    },
  );
  it('adds moved generation to an existing destination balance', async () => {
    const source = await createEnergyGraph({ withAllocation: false });
    const destination = await createEnergyGraph({ withAllocation: false });
    const plant = await createPlant(destination.distributor.id);
    const response = await api()
      .patch(`/monthly-generations/${source.generation.id}`)
      .auth(source.token, { type: 'bearer' })
      .send({ powerPlantId: plant.id });
    expect(response.status).toBe(200);
    await expectBalance(source.distributor.id, ['0', '0', '0']);
    await expectBalance(destination.distributor.id, ['200', '0', '200']);
    await expectEnergyIntegrity();
  });
  it('rejects moving generation already committed to credits', async () => {
    const graph = await createEnergyGraph();
    await expectRejected(
      api()
        .patch(`/monthly-generations/${graph.generation.id}`)
        .auth(graph.token, { type: 'bearer' })
        .send({ month: 'FEBRUARY' }),
      400,
      'Cannot move generation because credits already use this energy.',
    );
  });
  it('rolls back a move that collides with an existing monthly generation', async () => {
    const source = await createEnergyGraph({ withAllocation: false });
    const destination = await createEnergyGraph({ withAllocation: false });
    await expectRejected(
      api()
        .patch(`/monthly-generations/${source.generation.id}`)
        .auth(source.token, { type: 'bearer' })
        .send({ powerPlantId: destination.plant.id }),
      409,
      'Monthly generation already exists',
    );
    await expectEnergyIntegrity();
  });
  it('keeps decimal precision when reducing and deleting a generation', async () => {
    const graph = await createEnergyGraph({ withAllocation: false });
    const response = await api()
      .patch(`/monthly-generations/${graph.generation.id}`)
      .auth(graph.token, { type: 'bearer' })
      .send({ energyGeneratedMwh: 0.3 });
    expect(response.status).toBe(200);
    await expectBalance(graph.distributor.id, ['0.3', '0', '0.3']);
    const deleted = await api()
      .delete(`/monthly-generations/${graph.generation.id}`)
      .auth(graph.token, { type: 'bearer' });
    expect(deleted.status).toBe(200);
    expect(deleted.body.deleted).toMatchObject({
      id: graph.generation.id,
      energyGeneratedMwh: '0.3',
    });
    expect(
      await db.monthlyGeneration.findUnique({ where: { id: graph.generation.id } }),
    ).toBeNull();
    await expectBalance(graph.distributor.id, ['0', '0', '0']);
    await expectEnergyIntegrity();
  });
  it('rejects deleting generation committed to credits', async () => {
    const graph = await createEnergyGraph();
    await expectRejected(
      api()
        .delete(`/monthly-generations/${graph.generation.id}`)
        .auth(graph.token, { type: 'bearer' }),
      400,
      'Cannot delete generation because credits already use this energy.',
    );
  });
  it.each(['delete', 'move'] as const)(
    'permits %s when other generation still covers existing allocations',
    async (operation) => {
      const graph = await createEnergyGraph();
      const otherPlant = await createPlant(graph.distributor.id);
      const created = await api()
        .post('/monthly-generations')
        .auth(graph.token, { type: 'bearer' })
        .send(generationInput(otherPlant.id));
      expect(created.status).toBe(201);
      await expectBalance(graph.distributor.id, ['200', '30', '170']);
      const pending =
        operation === 'delete'
          ? api()
              .delete(`/monthly-generations/${graph.generation.id}`)
              .auth(graph.token, { type: 'bearer' })
          : api()
              .patch(`/monthly-generations/${graph.generation.id}`)
              .auth(graph.token, { type: 'bearer' })
              .send({ month: 'FEBRUARY' });
      expect((await pending).status).toBe(200);
      await expectBalance(graph.distributor.id, ['100', '30', '70']);
      if (operation === 'move')
        await expectBalance(graph.distributor.id, ['100', '0', '100'], 'FEBRUARY');
      await expectEnergyIntegrity();
    },
  );
  it.each(['patch', 'delete'] as const)(
    'rejects %s when the source balance is absent',
    async (method) => {
      const graph = await createEnergyGraph({ withAllocation: false });
      await db.monthlyDistributorBalance.delete({ where: { id: graph.balance.id } });
      const pending = api()
        [method](`/monthly-generations/${graph.generation.id}`)
        .auth(graph.token, { type: 'bearer' });
      await expectRejected(
        method === 'patch' ? pending.send({ energyGeneratedMwh: 120 }) : pending,
        404,
        'Monthly distributor balance not found',
      );
    },
  );
});
