-- Preserve the existing capacity values while adopting the MW column name.
ALTER TABLE "PowerPlant" RENAME COLUMN "installedCapacityKw" TO "installedCapacityMw";

-- The Prisma model was renamed from CreditAllocations to CreditAllocation.
-- Renaming keeps every existing allocation and its foreign key intact.
ALTER TABLE "CreditAllocations" RENAME TO "CreditAllocation";

CREATE UNIQUE INDEX "PowerPlant_name_key" ON "PowerPlant"("name");
