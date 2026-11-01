import { describe, expect, it } from 'vitest';
import { raceOnBalance } from '../support/concurrency.js';
import { db } from '../support/database.js';
import { expectBalance, expectEnergyIntegrity } from '../support/energy-assertions.js';
import { createCompany, createEnergyGraph } from '../support/fixtures.js';
import { api } from '../support/server.js';

// Real row locks make the races reproducible without mocking services or transaction isolation.
describe('Coordinated PostgreSQL transactions', () => {
  it('commits only one of two allocations competing for the same available energy', async () => {
    const graph = await createEnergyGraph({ withAllocation: false });
    const secondCompany = await createCompany(graph.distributor.id);
    const responses = await raceOnBalance(graph.balance.id, () =>
      [graph.company, secondCompany].map((company) =>
        api().post('/credit-allocations').auth(graph.token, { type: 'bearer' }).send({
          clientCompanyId: company.id,
          year: 2026,
          month: 'JANUARY',
          energyAllocatedMwh: 80,
          percentageApplied: 80,
        }),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const winner = responses.find((response) => response.status === 201);
    const loserIndex = responses.findIndex((response) => response.status === 409);
    expect(responses[loserIndex]?.body).toMatchObject({
      statusCode: 409,
      message: 'The energy data changed concurrently. Please retry.',
    });
    expect(await db.creditAllocation.count()).toBe(1);
    expect((await db.creditAllocation.findFirstOrThrow()).id).toBe(winner?.body.created.id);
    const loserCompany = [graph.company, secondCompany][loserIndex];
    if (!loserCompany) throw new Error('Expected one rejected company allocation.');
    expect(await db.creditAllocation.count({ where: { clientCompanyId: loserCompany.id } })).toBe(
      0,
    );
    await expectBalance(graph.distributor.id, ['100', '80', '20']);
    await expectEnergyIntegrity();
  });

  it.each(['reduce', 'delete'] as const)(
    'serializes generation %s against a new allocation',
    async (operation) => {
      const graph = await createEnergyGraph({ withAllocation: false });
      const responses = await raceOnBalance(graph.balance.id, () => [
        operation === 'reduce'
          ? api()
              .patch(`/monthly-generations/${graph.generation.id}`)
              .auth(graph.token, { type: 'bearer' })
              .send({ energyGeneratedMwh: 50 })
          : api()
              .delete(`/monthly-generations/${graph.generation.id}`)
              .auth(graph.token, { type: 'bearer' }),
        api().post('/credit-allocations').auth(graph.token, { type: 'bearer' }).send({
          clientCompanyId: graph.company.id,
          year: 2026,
          month: 'JANUARY',
          energyAllocatedMwh: 80,
          percentageApplied: 80,
        }),
      ]);
      expect(responses.filter((response) => response.status === 409)).toHaveLength(1);
      if (responses[0]?.status === 200) {
        expect(responses[1]?.status).toBe(409);
        expect(await db.creditAllocation.count()).toBe(0);
        const amount = operation === 'reduce' ? '50' : '0';
        await expectBalance(graph.distributor.id, [amount, '0', amount]);
        expect(await db.monthlyGeneration.count()).toBe(operation === 'reduce' ? 1 : 0);
      } else {
        expect(responses[0]?.status).toBe(409);
        expect(responses[1]?.status).toBe(201);
        expect(
          (
            await db.monthlyGeneration.findUniqueOrThrow({ where: { id: graph.generation.id } })
          ).energyGeneratedMwh.toString(),
        ).toBe('100');
        await expectBalance(graph.distributor.id, ['100', '80', '20']);
      }
      await expectEnergyIntegrity();
    },
  );

  it('commits one correction of the same generation without combining stale deltas', async () => {
    const graph = await createEnergyGraph({ withAllocation: false });
    const responses = await raceOnBalance(graph.balance.id, () =>
      [120, 150].map((amount) =>
        api()
          .patch(`/monthly-generations/${graph.generation.id}`)
          .auth(graph.token, { type: 'bearer' })
          .send({ energyGeneratedMwh: amount }),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const winner = responses.find((response) => response.status === 200);
    const amount = String(winner?.body.updated.energyGeneratedMwh);
    expect(['120', '150']).toContain(amount);
    expect(
      (
        await db.monthlyGeneration.findUniqueOrThrow({ where: { id: graph.generation.id } })
      ).energyGeneratedMwh.toString(),
    ).toBe(amount);
    await expectBalance(graph.distributor.id, [amount, '0', amount]);
    await expectEnergyIntegrity();
  });
});
