/*
  Warnings:

  - You are about to alter the column `referral_code` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(36)` to `VarChar(10)`.

*/
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "referral_code" SET DATA TYPE VARCHAR(10);
