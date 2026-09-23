/*
  Warnings:

  - A unique constraint covering the columns `[clientCompanyId,year,month]` on the table `CreditAllocation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CreditAllocation_clientCompanyId_year_month_key" ON "CreditAllocation"("clientCompanyId", "year", "month");
