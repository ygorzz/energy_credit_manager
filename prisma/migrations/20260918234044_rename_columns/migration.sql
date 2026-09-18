/*
  Warnings:

  - You are about to drop the column `energyAllocatedKw` on the `CreditAllocation` table. All the data in the column will be lost.
  - You are about to drop the column `energyGeneratedKw` on the `MonthlyGeneration` table. All the data in the column will be lost.
  - Added the required column `energyAllocatedMw` to the `CreditAllocation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `energyGeneratedMw` to the `MonthlyGeneration` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ClientCompany" DROP CONSTRAINT "ClientCompany_distributorId_fkey";

-- DropForeignKey
ALTER TABLE "CreditAllocation" DROP CONSTRAINT "CreditAllocations_clientCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "MonthlyGeneration" DROP CONSTRAINT "MonthlyGeneration_powerPlantId_fkey";

-- DropForeignKey
ALTER TABLE "PowerPlant" DROP CONSTRAINT "PowerPlant_distributorId_fkey";

-- AlterTable
ALTER TABLE "CreditAllocation" DROP COLUMN "energyAllocatedKw",
ADD COLUMN     "energyAllocatedMw" DECIMAL(65,30) NOT NULL;
ALTER TABLE "CreditAllocation" RENAME CONSTRAINT "CreditAllocations_pkey" TO "CreditAllocation_pkey";

-- AlterTable
ALTER TABLE "MonthlyGeneration" DROP COLUMN "energyGeneratedKw",
ADD COLUMN     "energyGeneratedMw" DECIMAL(65,30) NOT NULL;

-- AddForeignKey
ALTER TABLE "PowerPlant" ADD CONSTRAINT "PowerPlant_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCompany" ADD CONSTRAINT "ClientCompany_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyGeneration" ADD CONSTRAINT "MonthlyGeneration_powerPlantId_fkey" FOREIGN KEY ("powerPlantId") REFERENCES "PowerPlant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAllocation" ADD CONSTRAINT "CreditAllocation_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
