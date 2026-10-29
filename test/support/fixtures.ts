import { randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import type { Prisma } from '../../src/db/generated/prisma/client.js';
import { db } from './database.js';

export const TEST_PASSWORD = 'IntegrationPassword123';
const passwordHash = bcrypt.hash(TEST_PASSWORD, 10);

function uniqueCnpj() {
  let digits = String(randomInt(100_000_000_000, 1_000_000_000_000));
  for (const weights of [
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  ]) {
    const remainder =
      weights.reduce((sum, weight, index) => sum + Number(digits[index]) * weight, 0) % 11;
    digits += remainder < 2 ? '0' : String(11 - remainder);
  }
  return digits;
}

export function createDistributor(overrides: Partial<Prisma.DistributorUncheckedCreateInput> = {}) {
  return db.distributor.create({ data: { name: `DISTRIBUTOR ${randomUUID()}`, ...overrides } });
}

export function createCompany(
  distributorId: string,
  overrides: Partial<Prisma.ClientCompanyUncheckedCreateInput> = {},
) {
  return db.clientCompany.create({
    data: {
      name: `COMPANY ${randomUUID()}`,
      cnpj: uniqueCnpj(),
      allocationPercentage: 30,
      distributorId,
      ...overrides,
    },
  });
}

export function createPlant(
  distributorId: string,
  overrides: Partial<Prisma.PowerPlantUncheckedCreateInput> = {},
) {
  return db.powerPlant.create({
    data: {
      name: `PLANT ${randomUUID()}`,
      state: 'SP',
      city: 'Test city',
      sourceType: 'SOLAR',
      installedCapacityMw: 1,
      status: 'ACTIVE',
      distributorId,
      ...overrides,
    },
  });
}

export async function createUser(overrides: Partial<Prisma.UserUncheckedCreateInput> = {}) {
  const user = await db.user.create({
    data: {
      name: 'Integration User',
      email: `${randomUUID()}@EXAMPLE.COM`,
      hashPassword: await passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      companyId: null,
      ...overrides,
    },
  });
  const token = jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
  return { user, token };
}

// Build a consistent initial graph directly in PostgreSQL, without depending on endpoints under test.
export async function createEnergyGraph({ withAllocation = true } = {}) {
  const distributor = await createDistributor();
  const company = await createCompany(distributor.id);
  const plant = await createPlant(distributor.id);
  const auth = await createUser({ companyId: company.id });
  const generation = await db.monthlyGeneration.create({
    data: { powerPlantId: plant.id, month: 'JANUARY', year: 2026, energyGeneratedMwh: 100 },
  });
  const allocation = withAllocation
    ? await db.creditAllocation.create({
        data: {
          clientCompanyId: company.id,
          month: 'JANUARY',
          year: 2026,
          energyAllocatedMwh: 30,
          percentageApplied: 30,
        },
      })
    : null;
  const balance = await db.monthlyDistributorBalance.create({
    data: {
      distributorId: distributor.id,
      month: 'JANUARY',
      year: 2026,
      totalEnergyGeneratedMwh: 100,
      totalEnergyAllocatedMwh: withAllocation ? 30 : 0,
      avaliableEnergyMwh: withAllocation ? 70 : 100,
    },
  });
  return { distributor, company, plant, generation, allocation, balance, ...auth };
}
