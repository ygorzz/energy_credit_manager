/*
  Warnings:

  - Added the required column `year` to the `MonthlyGeneration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MonthlyGeneration" ADD COLUMN     "year" INTEGER NOT NULL;
