import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectRejected } from '../support/assertions.js';
import { db } from '../support/database.js';
import {
  createCompany,
  createDistributor,
  createEnergyGraph,
  createUser,
} from '../support/fixtures.js';
import { describeReadContract, describeWriteValidation } from '../support/route-contracts.js';
import { api } from '../support/server.js';

const companyInput = (distributorId: string) => ({
  name: 'New company',
  cnpj: '11222333000181',
  allocationPercentage: 30,
  distributorId,
});

describeReadContract({
  path: '/client-companies',
  patch: { name: 'Updated company' },
  seed: async (count) => {
    const distributor = await createDistributor();
    const records = [];
    for (let index = 0; index < count; index++) records.push(await createCompany(distributor.id));
    return records;
  },
});

describeWriteValidation({
  path: '/client-companies',
  prepare: async () => {
    const auth = await createUser();
    const distributor = await createDistributor();
    const company = await createCompany(distributor.id);
    return { token: auth.token, id: company.id, body: companyInput(distributor.id) };
  },
  required: ['name', 'cnpj', 'allocationPercentage', 'distributorId'],
  invalid: [
    { name: '' },
    { name: '  ' },
    { name: 'a'.repeat(101) },
    { name: null },
    { name: 123 },
    { cnpj: '123' },
    { cnpj: '11-222-333/0001-81' },
    { cnpj: '1122233300018A' },
    { cnpj: null },
    { cnpj: 123 },
    { allocationPercentage: -1 },
    { allocationPercentage: 101 },
    { allocationPercentage: 30.5 },
    { allocationPercentage: '30' },
    { allocationPercentage: null },
    { distributorId: 'invalid' },
    { distributorId: null },
  ],
});

describe('Client company writes', () => {
  it.each([0, 100])(
    'creates and reads a company at percentage boundary %s',
    async (allocationPercentage) => {
      const auth = await createUser();
      const distributor = await createDistributor();
      const response = await api()
        .post('/client-companies')
        .auth(auth.token, { type: 'bearer' })
        .send({
          ...companyInput(distributor.id),
          name: ' normalized company ',
          cnpj: '11.222.333/0001-81',
          allocationPercentage,
          unknown: true,
        });
      expect(response.status).toBe(201);
      expect(response.body.created).toMatchObject({
        name: 'NORMALIZED COMPANY',
        cnpj: '11222333000181',
        allocationPercentage,
      });
      expect(
        await db.clientCompany.findUniqueOrThrow({ where: { id: response.body.created.id } }),
      ).toEqual(response.body.created);
      const read = await api()
        .get(`/client-companies/${response.body.created.id}`)
        .auth(auth.token, { type: 'bearer' });
      expect(read.status).toBe(200);
      expect(read.body).toEqual(response.body.created);
    },
  );
  it.each(['post', 'patch'] as const)(
    'rejects nonexistent distributor references on %s',
    async (method) => {
      const auth = await createUser();
      const company = await createCompany((await createDistributor()).id);
      await expectRejected(
        api()
          [method](method === 'post' ? '/client-companies' : `/client-companies/${company.id}`)
          .auth(auth.token, { type: 'bearer' })
          .send(method === 'post' ? companyInput(randomUUID()) : { distributorId: randomUUID() }),
        404,
      );
    },
  );
  it.each(['post', 'patch'] as const)('rejects masked duplicate CNPJ on %s', async (method) => {
    const auth = await createUser();
    const distributor = await createDistributor();
    await createCompany(distributor.id, { cnpj: '11222333000181' });
    const target = await createCompany(distributor.id);
    await expectRejected(
      api()
        [method](method === 'post' ? '/client-companies' : `/client-companies/${target.id}`)
        .auth(auth.token, { type: 'bearer' })
        .send(
          method === 'post'
            ? { ...companyInput(distributor.id), cnpj: '11.222.333/0001-81' }
            : { cnpj: '11.222.333/0001-81' },
        ),
      409,
      'Already exists a client company with this CNPJ',
    );
  });
  it.each(['post', 'patch'] as const)('rejects invalid CNPJ check digits on %s', async (method) => {
    const auth = await createUser();
    const distributor = await createDistributor();
    const company = await createCompany(distributor.id);
    for (const cnpj of ['00000000000000', '11222333000180', '11222333000171']) {
      await expectRejected(
        api()
          [method](method === 'post' ? '/client-companies' : `/client-companies/${company.id}`)
          .auth(auth.token, { type: 'bearer' })
          .send(method === 'post' ? { ...companyInput(distributor.id), cnpj } : { cnpj }),
        400,
        'Invalid CNPJ',
      );
    }
  });
  it('changes all fields and distributor without allocation history', async () => {
    const auth = await createUser();
    const company = await createCompany((await createDistributor()).id);
    const distributor = await createDistributor();
    const response = await api()
      .patch(`/client-companies/${company.id}`)
      .auth(auth.token, { type: 'bearer' })
      .send({
        name: ' Updated company ',
        cnpj: '04.252.011/0001-10',
        allocationPercentage: 100,
        distributorId: distributor.id,
      });
    expect(response.status).toBe(200);
    const expected = {
      id: company.id,
      name: 'UPDATED COMPANY',
      cnpj: '04252011000110',
      allocationPercentage: 100,
      distributorId: distributor.id,
    };
    expect(response.body.updated).toEqual(expected);
    expect(await db.clientCompany.findUniqueOrThrow({ where: { id: company.id } })).toEqual(
      expected,
    );
  });
  // Allocation history keeps distributor ownership stable until a dedicated transfer flow exists.
  it('rejects distributor changes with allocation history without applying other fields', async () => {
    const graph = await createEnergyGraph();
    const distributor = await createDistributor();
    await expectRejected(
      api()
        .patch(`/client-companies/${graph.company.id}`)
        .auth(graph.token, { type: 'bearer' })
        .send({ distributorId: distributor.id, allocationPercentage: 90 }),
      409,
      'Cannot change distributor of a company with allocation history',
    );
  });
  it('allows the existing distributor and a new default without rewriting historical allocations', async () => {
    const graph = await createEnergyGraph();
    const response = await api()
      .patch(`/client-companies/${graph.company.id}`)
      .auth(graph.token, { type: 'bearer' })
      .send({ distributorId: graph.distributor.id, name: 'Updated', allocationPercentage: 80 });
    expect(response.status).toBe(200);
    expect(response.body.updated).toMatchObject({ name: 'UPDATED', allocationPercentage: 80 });
    if (!graph.allocation) throw new Error('Expected an allocation fixture.');
    expect(
      await db.creditAllocation.findUniqueOrThrow({ where: { id: graph.allocation.id } }),
    ).toEqual(graph.allocation);
    expect(
      await db.monthlyDistributorBalance.findUniqueOrThrow({ where: { id: graph.balance.id } }),
    ).toEqual(graph.balance);
  });
  it('deletes an unlinked company with 200 and returns its data', async () => {
    const auth = await createUser();
    const company = await createCompany((await createDistributor()).id);
    const response = await api()
      .delete(`/client-companies/${company.id}`)
      .auth(auth.token, { type: 'bearer' });
    expect(response.status).toBe(200);
    expect(response.body.deleted).toEqual(company);
    expect(await db.clientCompany.findUnique({ where: { id: company.id } })).toBeNull();
  });
  it.each(['ADMIN', 'ANALYST'] as const)(
    'unlinks optional %s users when deleting a company',
    async (role) => {
      const auth = await createUser();
      const company = await createCompany((await createDistributor()).id);
      const linked = await createUser({ role, companyId: company.id });
      const response = await api()
        .delete(`/client-companies/${company.id}`)
        .auth(auth.token, { type: 'bearer' });
      expect(response.status).toBe(200);
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: linked.user.id } })).companyId,
      ).toBeNull();
    },
  );
  it('rejects deletion with linked CLIENT users', async () => {
    const auth = await createUser();
    const company = await createCompany((await createDistributor()).id);
    await createUser({ role: 'CLIENT', companyId: company.id });
    await expectRejected(
      api().delete(`/client-companies/${company.id}`).auth(auth.token, { type: 'bearer' }),
      409,
      'Cannot delete a company with linked client users',
    );
  });
  it('rejects deletion with allocation history', async () => {
    const graph = await createEnergyGraph();
    await expectRejected(
      api().delete(`/client-companies/${graph.company.id}`).auth(graph.token, { type: 'bearer' }),
      409,
      'Cannot delete a client company with allocation history',
    );
  });
});
