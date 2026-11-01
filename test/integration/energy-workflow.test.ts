import { describe, expect, it } from 'vitest';
import { expectRejected } from '../support/assertions.js';
import { db } from '../support/database.js';
import { expectBalance, expectEnergyIntegrity } from '../support/energy-assertions.js';
import { createUser, TEST_PASSWORD } from '../support/fixtures.js';
import { api } from '../support/server.js';

// Only the initial administrator is a fixture; the operational flow uses existing HTTP endpoints.
describe('Complete monthly energy workflow', () => {
  it('registers accounts, records energy, corrects allocations and safely removes eligible records', async () => {
    const bootstrap = await createUser();
    const login = await api()
      .post('/auth/login')
      .send({ email: bootstrap.user.email, password: TEST_PASSWORD });
    expect(login.status).toBe(200);
    const token: string = login.body.token;
    const distributor = await api()
      .post('/distributors')
      .auth(token, { type: 'bearer' })
      .send({ name: ' Workflow distributor ' });
    expect(distributor.status).toBe(201);
    const distributorId: string = distributor.body.created.id;
    const plant = await api().post('/power-plants').auth(token, { type: 'bearer' }).send({
      name: 'Workflow plant',
      state: 'SP',
      city: 'Test city',
      sourceType: 'SOLAR',
      installedCapacityMw: 1,
      distributorId,
    });
    expect(plant.status).toBe(201);
    const plantId: string = plant.body.created.id;
    const company = await api().post('/client-companies').auth(token, { type: 'bearer' }).send({
      name: 'Workflow company',
      cnpj: '11.222.333/0001-81',
      allocationPercentage: 30,
      distributorId,
    });
    expect(company.status).toBe(201);
    const companyId: string = company.body.created.id;

    const accounts: { id: string; token: string; role: 'CLIENT' | 'ANALYST' }[] = [];
    for (const role of ['CLIENT', 'ANALYST'] as const) {
      const email = `${role.toLowerCase()}@workflow.example`;
      const registered = await api()
        .post('/auth/register')
        .auth(token, { type: 'bearer' })
        .send({
          name: `${role} user`,
          email,
          password: TEST_PASSWORD,
          role,
          companyId: role === 'CLIENT' ? companyId : null,
        });
      expect(registered.status).toBe(201);
      expect(registered.body.created).not.toHaveProperty('hashPassword');
      const signedIn = await api().post('/auth/login').send({ email, password: TEST_PASSWORD });
      expect(signedIn.status).toBe(200);
      accounts.push({ id: registered.body.created.id, token: signedIn.body.token, role });
    }
    const client = accounts.find((account) => account.role === 'CLIENT');
    const analyst = accounts.find((account) => account.role === 'ANALYST');
    if (!client || !analyst) throw new Error('Expected both operational accounts.');
    // Dedicated client endpoints are a future feature; current administrative access stays forbidden.
    await expectRejected(
      api().get(`/client-companies/${companyId}`).auth(client.token, { type: 'bearer' }),
      403,
    );

    const generations: { id: string; month: 'JANUARY' | 'FEBRUARY' }[] = [];
    for (const month of ['JANUARY', 'FEBRUARY'] as const) {
      const response = await api()
        .post('/monthly-generations')
        .auth(token, { type: 'bearer' })
        .send({
          powerPlantId: plantId,
          year: 2026,
          month,
          energyGeneratedMwh: month === 'JANUARY' ? 100 : 80,
        });
      expect(response.status).toBe(201);
      generations.push({ id: response.body.created.id, month });
    }
    const allocation = await api()
      .post('/credit-allocations')
      .auth(analyst.token, { type: 'bearer' })
      .send({ clientCompanyId: companyId, year: 2026, month: 'JANUARY', energyAllocatedMwh: 30 });
    expect(allocation.status).toBe(201);
    expect(allocation.body.created.percentageApplied).toBe('30');
    const allocationId: string = allocation.body.created.id;
    await expectBalance(distributorId, ['100', '30', '70']);
    await expectBalance(distributorId, ['80', '0', '80'], 'FEBRUARY');

    for (const [path, id] of [
      ['distributors', distributorId],
      ['power-plants', plantId],
      ['client-companies', companyId],
      ['monthly-generations', generations[0]?.id],
      ['credit-allocations', allocationId],
      ['users', client.id],
    ]) {
      const list = await api().get(`/${path}`).auth(analyst.token, { type: 'bearer' });
      expect(list.status).toBe(200);
      expect(list.body).toEqual(expect.arrayContaining([expect.objectContaining({ id })]));
      const single = await api().get(`/${path}/${id}`).auth(analyst.token, { type: 'bearer' });
      expect(single.status).toBe(200);
      expect(single.body.id).toBe(id);
    }
    const moved = await api()
      .patch(`/credit-allocations/${allocationId}`)
      .auth(token, { type: 'bearer' })
      .send({ month: 'FEBRUARY', energyAllocatedMwh: 24 });
    expect(moved.status).toBe(200);
    expect(moved.body.updated).toMatchObject({
      month: 'FEBRUARY',
      percentageApplied: '30',
      energyAllocatedMwh: '24',
    });
    await expectBalance(distributorId, ['100', '0', '100']);
    await expectBalance(distributorId, ['80', '24', '56'], 'FEBRUARY');
    const january = generations.find((record) => record.month === 'JANUARY');
    if (!january) throw new Error('Expected a January generation.');
    expect(
      (
        await api()
          .patch(`/monthly-generations/${january.id}`)
          .auth(token, { type: 'bearer' })
          .send({ energyGeneratedMwh: 120 })
      ).status,
    ).toBe(200);
    await expectBalance(distributorId, ['120', '0', '120']);
    await expectEnergyIntegrity();

    expect(
      (await api().delete(`/credit-allocations/${allocationId}`).auth(token, { type: 'bearer' }))
        .status,
    ).toBe(200);
    await expectBalance(distributorId, ['80', '0', '80'], 'FEBRUARY');
    for (const generation of generations)
      expect(
        (
          await api()
            .delete(`/monthly-generations/${generation.id}`)
            .auth(token, { type: 'bearer' })
        ).status,
      ).toBe(200);
    await expectBalance(distributorId, ['0', '0', '0']);
    await expectBalance(distributorId, ['0', '0', '0'], 'FEBRUARY');
    for (const account of accounts)
      expect(
        (await api().delete(`/users/${account.id}`).auth(token, { type: 'bearer' })).status,
      ).toBe(200);
    await expectRejected(
      api().get('/distributors').auth(client.token, { type: 'bearer' }),
      401,
      'User no longer exists',
    );
    expect(
      (await api().delete(`/client-companies/${companyId}`).auth(token, { type: 'bearer' })).status,
    ).toBe(200);
    expect(
      (await api().delete(`/power-plants/${plantId}`).auth(token, { type: 'bearer' })).status,
    ).toBe(200);
    // Zero-valued monthly balances still preserve distributor history and prevent deletion.
    await expectRejected(
      api().delete(`/distributors/${distributorId}`).auth(token, { type: 'bearer' }),
      409,
    );
    expect(await db.creditAllocation.count()).toBe(0);
    expect(await db.monthlyGeneration.count()).toBe(0);
    expect(await db.clientCompany.count()).toBe(0);
    expect(await db.powerPlant.count()).toBe(0);
    expect(await db.monthlyDistributorBalance.count()).toBe(2);
    await expectEnergyIntegrity();
  }, 30_000);
});
