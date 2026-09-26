/*
  Warnings:

  - You are about to drop the column `energyAllocatedMw` on the `CreditAllocation` table. All the data in the column will be lost.
  - You are about to drop the column `energyGeneratedMw` on the `MonthlyGeneration` table. All the data in the column will be lost.
  - Added the required column `energyAllocatedMwh` to the `CreditAllocation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `energyGeneratedMwh` to the `MonthlyGeneration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CreditAllocation" DROP COLUMN "energyAllocatedMw",
ADD COLUMN     "energyAllocatedMwh" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "MonthlyGeneration" DROP COLUMN "energyGeneratedMw",
ADD COLUMN     "energyGeneratedMwh" DECIMAL(65,30) NOT NULL;

-- CreateTable
CREATE TABLE "MonthlyDistributorBalance" (
    "id" TEXT NOT NULL,
    "month" "Months" NOT NULL,
    "year" INTEGER NOT NULL,
    "totalEnergyGeneratedMwh" DECIMAL(65,30) NOT NULL,
    "totalEnergyAllocatedMwh" DECIMAL(65,30) NOT NULL,
    "avaliableEnergyMwh" DECIMAL(65,30) NOT NULL,
    "distributorId" TEXT NOT NULL,

    CONSTRAINT "MonthlyDistributorBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyDistributorBalance_distributorId_year_month_key" ON "MonthlyDistributorBalance"("distributorId", "year", "month");

-- AddForeignKey
ALTER TABLE "MonthlyDistributorBalance" ADD CONSTRAINT "MonthlyDistributorBalance_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
