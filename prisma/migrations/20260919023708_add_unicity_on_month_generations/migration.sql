/*
  Warnings:

  - A unique constraint covering the columns `[powerPlantId,month,year]` on the table `MonthlyGeneration` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MonthlyGeneration_powerPlantId_month_year_key" ON "MonthlyGeneration"("powerPlantId", "month", "year");
