/*
  Warnings:

  - Added the required column `year` to the `CreditAllocation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CreditAllocation" ADD COLUMN     "year" INTEGER NOT NULL;
