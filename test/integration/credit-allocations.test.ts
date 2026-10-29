import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectRejected } from '../support/assertions.js';
import { db } from '../support/database.js';
import { expectBalance, expectEnergyIntegrity } from '../support/energy-assertions.js';
import { createCompany, createEnergyGraph, createPlant, createUser } from '../support/fixtures.js';
import { describeReadContract, describeWriteValidation } from '../support/route-contracts.js';
import { api } from '../support/server.js';

const allocationInput = (clientCompanyId: string) => ({
  clientCompanyId,
  month: 'JANUARY',
  year: 2026,
  energyAllocatedMwh: 30,
});
type Graph = Awaited<ReturnType<typeof createEnergyGraph>>;
function allocationId(graph: Graph) {
  if (!graph.allocation) throw new Error('Expected an allocation fixture.');
  return graph.allocation.id;
}

describeReadContract({
  path: '/credit-allocations',
  patch: { energyAllocatedMwh: 30 },
  seed: async (count) => {
    const records = [];
    for (let index = 0; index < count; index++) {
      const graph = await createEnergyGraph();
      if (!graph.allocation) throw new Error('Expected an allocation fixture.');
      records.push(graph.allocation);
    }
    return records;
  },
});

describeWriteValidation({
  path: '/credit-allocations',
  prepare: async () => {
    const graph = await createEnergyGraph();
    return {
      token: graph.token,
      id: allocationId(graph),
      body: { ...allocationInput(graph.company.id), month: 'FEBRUARY' },
    };
  },
  required: ['clientCompanyId', 'month', 'year', 'energyAllocatedMwh'],
  invalid: [
    { month: 'INVALID' },
    { month: null },
    { month: 1 },
    { year: 1999 },
    { year: 2101 },
    { year: 2026.5 },
    { year: '2026' },
    { year: null },
    { energyAllocatedMwh: -1 },
    { energyAllocatedMwh: '30' },
    { energyAllocatedMwh: null },
    { percentageApplied: -1 },
    { percentageApplied: 101 },
    { percentageApplied: '30' },
    { clientCompanyId: 'invalid' },
    { clientCompanyId: null },
  ],
});

// Creation resolves the default percentage and checks the manually supplied quantity against it.
describe('POST /credit-allocations business rules', () => {
  it.each([{}, { percentageApplied: null }, { percentageApplied: 30 }])(
    'accepts omitted, null or explicit percentage %#',
    async (override) => {
      const graph = await createEnergyGraph({ withAllocation: false });
      const response = await api()
        .post('/credit-allocations')
        .auth(graph.token, { type: 'bearer' })
        .send({ ...allocationInput(graph.company.id), ...override });
      expect(response.status).toBe(201);
      expect(response.body.created).toMatchObject({
        clientCompanyId: graph.company.id,
        percentageApplied: '30',
        energyAllocatedMwh: '30',
      });
      const stored = await db.creditAllocation.findUniqueOrThrow({
        where: { id: response.body.created.id },
      });
      expect(stored.percentageApplied.toString()).toBe('30');
      await expectBalance(graph.distributor.id, ['100', '30', '70']);
      await expectEnergyIntegrity();
    },
  );
  it('allows ANALYST to create allocations', async () => {
    const graph = await createEnergyGraph({ withAllocation: false });
    const analyst = await createUser({ role: 'ANALYST' });
    expect(
      (
        await api()
          .post('/credit-allocations')
          .auth(analyst.token, { type: 'bearer' })
          .send(allocationInput(graph.company.id))
      ).status,
    ).toBe(201);
    await expectEnergyIntegrity();
  });
  it.each([0, 100])('accepts explicit energy/percentage boundary %s', async (amount) => {
    const graph = await createEnergyGraph({ withAllocation: false });
    const response = await api()
      .post('/credit-allocations')
      .auth(graph.token, { type: 'bearer' })
      .send({
        ...allocationInput(graph.company.id),
        energyAllocatedMwh: amount,
        percentageApplied: amount,
      });
    expect(response.status).toBe(201);
    expect(response.body.created).toMatchObject({
      energyAllocatedMwh: String(amount),
      percentageApplied: String(amount),
    });
    await expectBalance(graph.distributor.id, ['100', String(amount), String(100 - amount)]);
    await expectEnergyIntegrity();
  });
  it('accepts the company default of zero as a supplied business value', async () => {
    const graph = await createEnergyGraph({ withAllocation: false });
    await db.clientCompany.update({
      where: { id: graph.company.id },
      data: { allocationPercentage: 0 },
    });
    const response = await api()
      .post('/credit-allocations')
      .auth(graph.token, { type: 'bearer' })
      .send({ ...allocationInput(graph.company.id), energyAllocatedMwh: 0 });
    expect(response.status).toBe(201);
    expect(response.body.created.percentageApplied).toBe('0');
    await expectBalance(graph.distributor.id, ['100', '0', '100']);
    await expectEnergyIntegrity();
  });
  // Percentages use total distributor generation even after earlier allocations consume availability.
  it('uses generation from all distributor plants rather than the remaining available energy', async () => {
    const graph = await createEnergyGraph({ withAllocation: false });
    const plant = await createPlant(graph.distributor.id);
    expect(
      (
        await api()
          .post('/monthly-generations')
          .auth(graph.token, { type: 'bearer' })
          .send({ powerPlantId: plant.id, year: 2026, month: 'JANUARY', energyGeneratedMwh: 100 })
      ).status,
    ).toBe(201);
    const first = await api()
      .post('/credit-allocations')
      .auth(graph.token, { type: 'bearer' })
      .send({ ...allocationInput(graph.company.id), energyAllocatedMwh: 60 });
    expect(first.status).toBe(201);
    const company = await createCompany(graph.distributor.id, { allocationPercentage: 10 });
    const second = await api()
      .post('/credit-allocations')
      .auth(graph.token, { type: 'bearer' })
      .send({ ...allocationInput(company.id), energyAllocatedMwh: 20 });
    expect(second.status).toBe(201);
    await expectBalance(graph.distributor.id, ['200', '80', '120']);
    await expectEnergyIntegrity();
  });
  it.each([
    { energy: 33.33333333, percentage: 33.33 },
    { energy: 33.33333333, percentage: 33.334 },
    { energy: 33.335, percentage: 33.34 },
  ])(
    'compares rounded percentages and preserves energy precision %#',
    async ({ energy, percentage }) => {
      const graph = await createEnergyGraph({ withAllocation: false });
      const response = await api()
        .post('/credit-allocations')
        .auth(graph.token, { type: 'bearer' })
        .send({
          ...allocationInput(graph.company.id),
          energyAllocatedMwh: energy,
          percentageApplied: percentage,
        });
      expect(response.status).toBe(201);
      expect(response.body.created).toMatchObject({
        energyAllocatedMwh: String(energy),
        percentageApplied: String(percentage),
      });
      expect(
        (
          await db.creditAllocation.findUniqueOrThrow({ where: { id: response.body.created.id } })
        ).energyAllocatedMwh.toString(),
      ).toBe(String(energy));
      await expectEnergyIntegrity();
    },
  );
  it.each([
    { energyAllocatedMwh: 30, percentageApplied: 40 },
    { energyAllocatedMwh: 33.335, percentageApplied: 33.33 },
    { energyAllocatedMwh: 33.334, percentageApplied: 33.335 },
  ])('rejects mismatched rounded percentages %#', async (override) => {
    const graph = await createEnergyGraph({ withAllocation: false });
    await expectRejected(
      api()
        .post('/credit-allocations')
        .auth(graph.token, { type: 'bearer' })
        .send({ ...allocationInput(graph.company.id), ...override }),
      400,
      'The allocation percentage does not correspond to the requested energy allocated.',
    );
  });
  it('rejects quantity incompatible with the company default', async () => {
    const graph = await createEnergyGraph({ withAllocation: false });
    await expectRejected(
      api()
        .post('/credit-allocations')
        .auth(graph.token, { type: 'bearer' })
        .send({ ...allocationInput(graph.company.id), energyAllocatedMwh: 20 }),
      400,
    );
  });
  it('rejects a nonexistent company', async () => {
    const graph = await createEnergyGraph({ withAllocation: false });
    await expectRejected(
      api()
        .post('/credit-allocations')
        .auth(graph.token, { type: 'bearer' })
        .send(allocationInput(randomUUID())),
      404,
      'Client company not found',
    );
  });
  it.each(['absent', 'zero'])(
    'rejects %s monthly generation even for a zero allocation',
    async (kind) => {
      const graph = await createEnergyGraph({ withAllocation: false });
      if (kind === 'zero') {
        expect(
          (
            await api()
              .patch(`/monthly-generations/${graph.generation.id}`)
              .auth(graph.token, { type: 'bearer' })
              .send({ energyGeneratedMwh: 0 })
          ).status,
        ).toBe(200);
      }
      await expectRejected(
        api()
          .post('/credit-allocations')
          .auth(graph.token, { type: 'bearer' })
          .send({
            ...allocationInput(graph.company.id),
            month: kind === 'absent' ? 'FEBRUARY' : 'JANUARY',
            energyAllocatedMwh: 0,
            percentageApplied: 0,
          }),
        400,
        'Unable to allocate credits. No positive generation in this period.',
      );
    },
  );
  it('rejects energy exceeding availability even with a correct percentage', async () => {
    const graph = await createEnergyGraph();
    const company = await createCompany(graph.distributor.id);
    await expectRejected(
      api()
        .post('/credit-allocations')
        .auth(graph.token, { type: 'bearer' })
        .send({ ...allocationInput(company.id), energyAllocatedMwh: 80, percentageApplied: 80 }),
      400,
      'The requested energy allocated exceeds the available energy.',
    );
  });
  it('rejects duplicate company/month/year and rolls back balance changes', async () => {
    const graph = await createEnergyGraph();
    await expectRejected(
      api()
        .post('/credit-allocations')
        .auth(graph.token, { type: 'bearer' })
        .send(allocationInput(graph.company.id)),
      409,
      'Already exits a register with these data',
    );
    await expectEnergyIntegrity();
  });
});

// One balance receives only the delta; moves between periods or distributors adjust both balances.
describe('PATCH /credit-allocations effective values and movements', () => {
  it('rejects an increase whose delta exceeds the remaining shared availability', async () => {
    const graph = await createEnergyGraph();
    const company = await createCompany(graph.distributor.id);
    expect(
      (
        await api()
          .post('/credit-allocations')
          .auth(graph.token, { type: 'bearer' })
          .send({ ...allocationInput(company.id), energyAllocatedMwh: 50, percentageApplied: 50 })
      ).status,
    ).toBe(201);
    await expectBalance(graph.distributor.id, ['100', '80', '20']);
    await expectRejected(
      api()
        .patch(`/credit-allocations/${allocationId(graph)}`)
        .auth(graph.token, { type: 'bearer' })
        .send({ energyAllocatedMwh: 60, percentageApplied: 60 }),
      400,
      'The requested allocated energy exceeds the available energy.',
    );
    await expectEnergyIntegrity();
  });
  it('rejects a PATCH percentage on the wrong side of a half-up rounding boundary', async () => {
    const graph = await createEnergyGraph();
    await expectRejected(
      api()
        .patch(`/credit-allocations/${allocationId(graph)}`)
        .auth(graph.token, { type: 'bearer' })
        .send({ energyAllocatedMwh: 33.335, percentageApplied: 33.33 }),
      400,
      'The allocation percentage does not correspond to the requested energy allocated.',
    );
  });
  it.each([0, 20, 30, 40, 100])(
    'adjusts the balance by the delta for new energy %s',
    async (amount) => {
      const graph = await createEnergyGraph();
      const response = await api()
        .patch(`/credit-allocations/${allocationId(graph)}`)
        .auth(graph.token, { type: 'bearer' })
        .send({ energyAllocatedMwh: amount, percentageApplied: amount });
      expect(response.status).toBe(200);
      expect(response.body.updated).toMatchObject({
        id: allocationId(graph),
        energyAllocatedMwh: String(amount),
        percentageApplied: String(amount),
      });
      await expectBalance(graph.distributor.id, ['100', String(amount), String(100 - amount)]);
      await expectEnergyIntegrity();
    },
  );
  it('permits an unchanged allocation when all energy is already allocated', async () => {
    const graph = await createEnergyGraph();
    await db.creditAllocation.update({
      where: { id: allocationId(graph) },
      data: { energyAllocatedMwh: 100, percentageApplied: 100 },
    });
    await db.monthlyDistributorBalance.update({
      where: { id: graph.balance.id },
      data: { totalEnergyAllocatedMwh: 100, avaliableEnergyMwh: 0 },
    });
    const response = await api()
      .patch(`/credit-allocations/${allocationId(graph)}`)
      .auth(graph.token, { type: 'bearer' })
      .send({ energyAllocatedMwh: 100 });
    expect(response.status).toBe(200);
    await expectBalance(graph.distributor.id, ['100', '100', '0']);
    await expectEnergyIntegrity();
  });
  it('preserves omitted percentage instead of reapplying the changed company default', async () => {
    const graph = await createEnergyGraph();
    await db.clientCompany.update({
      where: { id: graph.company.id },
      data: { allocationPercentage: 40 },
    });
    const response = await api()
      .patch(`/credit-allocations/${allocationId(graph)}`)
      .auth(graph.token, { type: 'bearer' })
      .send({ energyAllocatedMwh: 30 });
    expect(response.status).toBe(200);
    expect(response.body.updated.percentageApplied).toBe('30');
    await expectBalance(graph.distributor.id, ['100', '30', '70']);
    await expectEnergyIntegrity();
  });
  it('uses the current company default only when percentage is null', async () => {
    const graph = await createEnergyGraph();
    await db.clientCompany.update({
      where: { id: graph.company.id },
      data: { allocationPercentage: 40 },
    });
    const response = await api()
      .patch(`/credit-allocations/${allocationId(graph)}`)
      .auth(graph.token, { type: 'bearer' })
      .send({ energyAllocatedMwh: 40, percentageApplied: null });
    expect(response.status).toBe(200);
    expect(response.body.updated.percentageApplied).toBe('40');
    await expectBalance(graph.distributor.id, ['100', '40', '60']);
    await expectEnergyIntegrity();
  });
  it.each([{ energyAllocatedMwh: 40 }, { percentageApplied: 40 }])(
    'rejects a partial update incompatible with retained values %#',
    async (body) => {
      const graph = await createEnergyGraph();
      await expectRejected(
        api()
          .patch(`/credit-allocations/${allocationId(graph)}`)
          .auth(graph.token, { type: 'bearer' })
          .send(body),
        400,
        'The allocation percentage does not correspond to the requested energy allocated.',
      );
    },
  );
  it('rejects null default when retained energy no longer matches the company percentage', async () => {
    const graph = await createEnergyGraph();
    await db.clientCompany.update({
      where: { id: graph.company.id },
      data: { allocationPercentage: 40 },
    });
    await expectRejected(
      api()
        .patch(`/credit-allocations/${allocationId(graph)}`)
        .auth(graph.token, { type: 'bearer' })
        .send({ percentageApplied: null }),
      400,
    );
  });
  it('uses half-up rounding for PATCH without rounding the stored energy', async () => {
    const graph = await createEnergyGraph();
    const response = await api()
      .patch(`/credit-allocations/${allocationId(graph)}`)
      .auth(graph.token, { type: 'bearer' })
      .send({ energyAllocatedMwh: 33.335, percentageApplied: 33.34 });
    expect(response.status).toBe(200);
    expect(response.body.updated.energyAllocatedMwh).toBe('33.335');
    await expectBalance(graph.distributor.id, ['100', '33.335', '66.665']);
    await expectEnergyIntegrity();
  });
  it.each(['company same distributor', 'company other distributor', 'month', 'year'])(
    'moves by %s with correct source/destination balances',
    async (kind) => {
      const source = await createEnergyGraph();
      let company = source.company;
      let distributor = source.distributor;
      const month = kind === 'month' ? 'FEBRUARY' : 'JANUARY';
      const year = kind === 'year' ? 2027 : 2026;
      if (kind === 'company other distributor') {
        const destination = await createEnergyGraph({ withAllocation: false });
        company = destination.company;
        distributor = destination.distributor;
      } else if (kind === 'company same distributor')
        company = await createCompany(source.distributor.id, { allocationPercentage: 90 });
      else
        expect(
          (
            await api()
              .post('/monthly-generations')
              .auth(source.token, { type: 'bearer' })
              .send({ powerPlantId: source.plant.id, year, month, energyGeneratedMwh: 100 })
          ).status,
        ).toBe(201);
      const response = await api()
        .patch(`/credit-allocations/${allocationId(source)}`)
        .auth(source.token, { type: 'bearer' })
        .send({ clientCompanyId: company.id, month, year });
      expect(response.status).toBe(200);
      expect(response.body.updated).toMatchObject({
        clientCompanyId: company.id,
        month,
        year,
        percentageApplied: '30',
        energyAllocatedMwh: '30',
      });
      if (kind !== 'company same distributor')
        await expectBalance(source.distributor.id, ['100', '0', '100']);
      await expectBalance(distributor.id, ['100', '30', '70'], month, year);
      await expectEnergyIntegrity();
    },
  );
  it('validates against destination generation and accepts corrected energy with the retained percentage', async () => {
    const source = await createEnergyGraph();
    const destination = await createEnergyGraph({ withAllocation: false });
    expect(
      (
        await api()
          .patch(`/monthly-generations/${destination.generation.id}`)
          .auth(source.token, { type: 'bearer' })
          .send({ energyGeneratedMwh: 200 })
      ).status,
    ).toBe(200);
    await expectRejected(
      api()
        .patch(`/credit-allocations/${allocationId(source)}`)
        .auth(source.token, { type: 'bearer' })
        .send({ clientCompanyId: destination.company.id }),
      400,
    );
    const response = await api()
      .patch(`/credit-allocations/${allocationId(source)}`)
      .auth(source.token, { type: 'bearer' })
      .send({ clientCompanyId: destination.company.id, energyAllocatedMwh: 60 });
    expect(response.status).toBe(200);
    await expectBalance(source.distributor.id, ['100', '0', '100']);
    await expectBalance(destination.distributor.id, ['200', '60', '140']);
    await expectEnergyIntegrity();
  });
  it('rejects a move colliding with an existing company/month/year allocation', async () => {
    const source = await createEnergyGraph();
    const destination = await createEnergyGraph();
    await expectRejected(
      api()
        .patch(`/credit-allocations/${allocationId(source)}`)
        .auth(source.token, { type: 'bearer' })
        .send({ clientCompanyId: destination.company.id }),
      409,
      'A credit allocation already exists for this company and period',
    );
    await expectEnergyIntegrity();
  });
  it('rejects an unknown destination company', async () => {
    const graph = await createEnergyGraph();
    await expectRejected(
      api()
        .patch(`/credit-allocations/${allocationId(graph)}`)
        .auth(graph.token, { type: 'bearer' })
        .send({ clientCompanyId: randomUUID() }),
      404,
      'Client company not found',
    );
  });
  it('rejects a destination period without generation', async () => {
    const graph = await createEnergyGraph();
    await expectRejected(
      api()
        .patch(`/credit-allocations/${allocationId(graph)}`)
        .auth(graph.token, { type: 'bearer' })
        .send({ month: 'FEBRUARY' }),
      404,
      'Target monthly distributor balance not found',
    );
  });
  it('rejects a destination with zero generation even for zero energy', async () => {
    const source = await createEnergyGraph();
    const destination = await createEnergyGraph({ withAllocation: false });
    expect(
      (
        await api()
          .patch(`/monthly-generations/${destination.generation.id}`)
          .auth(source.token, { type: 'bearer' })
          .send({ energyGeneratedMwh: 0 })
      ).status,
    ).toBe(200);
    await expectRejected(
      api()
        .patch(`/credit-allocations/${allocationId(source)}`)
        .auth(source.token, { type: 'bearer' })
        .send({
          clientCompanyId: destination.company.id,
          energyAllocatedMwh: 0,
          percentageApplied: 0,
        }),
      400,
      'Unable to allocate credits. No positive generation in this period.',
    );
  });
  it('rejects insufficient destination availability and leaves the source allocation untouched', async () => {
    const source = await createEnergyGraph();
    const destination = await createEnergyGraph();
    await db.creditAllocation.update({
      where: { id: allocationId(destination) },
      data: { energyAllocatedMwh: 80, percentageApplied: 80 },
    });
    await db.monthlyDistributorBalance.update({
      where: { id: destination.balance.id },
      data: { totalEnergyAllocatedMwh: 80, avaliableEnergyMwh: 20 },
    });
    const company = await createCompany(destination.distributor.id);
    await expectRejected(
      api()
        .patch(`/credit-allocations/${allocationId(source)}`)
        .auth(source.token, { type: 'bearer' })
        .send({ clientCompanyId: company.id }),
      400,
      'The requested allocated energy exceeds the available energy.',
    );
    await expectEnergyIntegrity();
  });
});

// Deletion returns energy; missing or inconsistent source balances prevent the operation.
describe('Allocation deletion and damaged source data', () => {
  it.each([30, 0.3, 0])('deletes energy %s and restores exact availability', async (amount) => {
    const graph = await createEnergyGraph();
    if (amount !== 30)
      expect(
        (
          await api()
            .patch(`/credit-allocations/${allocationId(graph)}`)
            .auth(graph.token, { type: 'bearer' })
            .send({ energyAllocatedMwh: amount, percentageApplied: amount })
        ).status,
      ).toBe(200);
    const response = await api()
      .delete(`/credit-allocations/${allocationId(graph)}`)
      .auth(graph.token, { type: 'bearer' });
    expect(response.status).toBe(200);
    expect(response.body.deleted).toMatchObject({
      id: allocationId(graph),
      energyAllocatedMwh: String(amount),
    });
    expect(await db.creditAllocation.findUnique({ where: { id: allocationId(graph) } })).toBeNull();
    await expectBalance(graph.distributor.id, ['100', '0', '100']);
    await expectEnergyIntegrity();
  });
  // Deliberately damaged fixtures verify refusal; tests must not silently repair historical data.
  it.each(['patch', 'delete'] as const)(
    'rejects %s with missing original balance',
    async (method) => {
      const graph = await createEnergyGraph();
      await db.monthlyDistributorBalance.delete({ where: { id: graph.balance.id } });
      const pending = api()
        [method](`/credit-allocations/${allocationId(graph)}`)
        .auth(graph.token, { type: 'bearer' });
      await expectRejected(
        method === 'patch' ? pending.send({ energyAllocatedMwh: 30 }) : pending,
        404,
      );
    },
  );
  it.each(['patch', 'delete'] as const)(
    'rejects %s when allocated balance is smaller than the stored credit',
    async (method) => {
      const graph = await createEnergyGraph();
      await db.monthlyDistributorBalance.update({
        where: { id: graph.balance.id },
        data: { totalEnergyAllocatedMwh: 20, avaliableEnergyMwh: 80 },
      });
      const pending = api()
        [method](`/credit-allocations/${allocationId(graph)}`)
        .auth(graph.token, { type: 'bearer' });
      await expectRejected(
        method === 'patch' ? pending.send({ energyAllocatedMwh: 30 }) : pending,
        409,
        'The monthly allocated balance is inconsistent with this credit.',
      );
    },
  );
});
