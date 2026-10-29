import { randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import type { Prisma } from '../../src/db/generated/prisma/client.js';
import { db } from './database.js';

export const TEST_PASSWORD = 'IntegrationPassword123';
// Reuse a real bcrypt hash within this worker without paying its cost for every fixture.
const passwordHash = bcrypt.hash(TEST_PASSWORD, 10);

// Generate both CNPJ check digits so unrelated tests start with valid company data.
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
  // Fixture names follow the same uppercase normalization as cadastral API writes.
  return db.distributor.create({
    data: { name: `DISTRIBUTOR ${randomUUID()}`.toUpperCase(), ...overrides },
  });
}

// Link a company to its distributor; overrides let each scenario set its own allocation default.
export function createCompany(
  distributorId: string,
  overrides: Partial<Prisma.ClientCompanyUncheckedCreateInput> = {},
) {
  return db.clientCompany.create({
    data: {
      name: `COMPANY ${randomUUID()}`.toUpperCase(),
      cnpj: uniqueCnpj(),
      allocationPercentage: 30,
      distributorId,
      ...overrides,
    },
  });
}

// Create an independent plant without using the endpoint whose behavior will be tested.
export function createPlant(
  distributorId: string,
  overrides: Partial<Prisma.PowerPlantUncheckedCreateInput> = {},
) {
  return db.powerPlant.create({
    data: {
      name: `PLANT ${randomUUID()}`.toUpperCase(),
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

// Persist the account and sign a real token for authentication against the database.
export async function createUser(overrides: Partial<Prisma.UserUncheckedCreateInput> = {}) {
  const user = await db.user.create({
    data: {
      name: 'Integration User',
      // Match the API's email normalization so fixture accounts can log in through HTTP.
      email: `${randomUUID()}@example.com`.toUpperCase(),
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
