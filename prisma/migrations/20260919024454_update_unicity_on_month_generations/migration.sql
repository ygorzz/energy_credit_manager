/*
  Warnings:

  - A unique constraint covering the columns `[powerPlantId,year,month]` on the table `MonthlyGeneration` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "MonthlyGeneration_powerPlantId_month_year_key";

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyGeneration_powerPlantId_year_month_key" ON "MonthlyGeneration"("powerPlantId", "year", "month");
