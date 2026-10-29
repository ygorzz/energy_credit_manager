import { expect } from 'vitest';
import { type Months, Prisma } from '../../src/db/generated/prisma/client.js';
import { db } from './database.js';

// Expected values are generated, allocated and available MWh, compared as exact decimal strings.
export async function expectBalance(
  distributorId: string,
  expected: [string, string, string],
  month: Months = 'JANUARY',
  year = 2026,
) {
  const balance = await db.monthlyDistributorBalance.findUniqueOrThrow({
    where: { distributorId_year_month: { distributorId, year, month } },
  });
  expect([
    balance.totalEnergyGeneratedMwh.toString(),
    balance.totalEnergyAllocatedMwh.toString(),
    balance.avaliableEnergyMwh.toString(),
  ]).toEqual(expected);
}

// Recompute invariants from persisted source records rather than trusting service responses.
export async function expectEnergyIntegrity() {
  const [balances, generations, allocations] = await Promise.all([
    db.monthlyDistributorBalance.findMany(),
    db.monthlyGeneration.findMany({ include: { powerPlant: true } }),
    db.creditAllocation.findMany({ include: { clientCompany: true } }),
  ]);
  const key = (distributorId: string, month: Months, year: number) =>
    `${distributorId}/${month}/${year}`;
  const keys = new Set(
    balances.map((balance) => key(balance.distributorId, balance.month, balance.year)),
  );
  // Every energy record must have a corresponding monthly distributor balance.
  for (const generation of generations)
    expect(
      keys.has(key(generation.powerPlant.distributorId, generation.month, generation.year)),
    ).toBe(true);
  for (const allocation of allocations)
    expect(
      keys.has(key(allocation.clientCompany.distributorId, allocation.month, allocation.year)),
    ).toBe(true);
  for (const balance of balances) {
    const generated = generations
      .filter(
        (row) =>
          key(row.powerPlant.distributorId, row.month, row.year) ===
          key(balance.distributorId, balance.month, balance.year),
      )
      .reduce((total, row) => total.add(row.energyGeneratedMwh), new Prisma.Decimal(0));
    const allocated = allocations
      .filter(
        (row) =>
          key(row.clientCompany.distributorId, row.month, row.year) ===
          key(balance.distributorId, balance.month, balance.year),
      )
      .reduce((total, row) => total.add(row.energyAllocatedMwh), new Prisma.Decimal(0));
    expect(balance.totalEnergyGeneratedMwh.toString()).toBe(generated.toString());
    expect(balance.totalEnergyAllocatedMwh.toString()).toBe(allocated.toString());
    expect(balance.avaliableEnergyMwh.toString()).toBe(generated.sub(allocated).toString());
    expect(balance.avaliableEnergyMwh.greaterThanOrEqualTo(0)).toBe(true);
  }
}
