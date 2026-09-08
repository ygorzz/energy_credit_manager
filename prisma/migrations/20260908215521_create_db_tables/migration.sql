/*
  Warnings:

  - You are about to drop the column `company_id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `hash_password` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `hashPassword` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ANALYST', 'CLIENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PowerPlantSourceTypes" AS ENUM ('SOLAR', 'HYDRO', 'WIND');

-- CreateEnum
CREATE TYPE "PowerPlantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "Months" AS ENUM ('JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "company_id",
DROP COLUMN "hash_password",
ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "hashPassword" TEXT NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
DROP COLUMN "status",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "PowerPlant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "sourceType" "PowerPlantSourceTypes" NOT NULL DEFAULT 'SOLAR',
    "installedCapacityKw" DECIMAL(65,30) NOT NULL,
    "status" "PowerPlantStatus" NOT NULL DEFAULT 'ACTIVE',
    "distributorId" TEXT NOT NULL,

    CONSTRAINT "PowerPlant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "allocationPercentage" INTEGER NOT NULL,
    "distributorId" TEXT NOT NULL,

    CONSTRAINT "ClientCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Distributor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Distributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyGeneration" (
    "id" TEXT NOT NULL,
    "month" "Months" NOT NULL,
    "energyGeneratedKw" DECIMAL(65,30) NOT NULL,
    "powerPlantId" TEXT NOT NULL,

    CONSTRAINT "MonthlyGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditAllocations" (
    "id" TEXT NOT NULL,
    "month" "Months" NOT NULL,
    "percentageApplied" DECIMAL(65,30) NOT NULL,
    "energyAllocatedKw" DECIMAL(65,30) NOT NULL,
    "clientCompanyId" TEXT NOT NULL,

    CONSTRAINT "CreditAllocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientCompany_cnpj_key" ON "ClientCompany"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Distributor_name_key" ON "Distributor"("name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PowerPlant" ADD CONSTRAINT "PowerPlant_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCompany" ADD CONSTRAINT "ClientCompany_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyGeneration" ADD CONSTRAINT "MonthlyGeneration_powerPlantId_fkey" FOREIGN KEY ("powerPlantId") REFERENCES "PowerPlant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAllocations" ADD CONSTRAINT "CreditAllocations_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
