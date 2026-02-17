/*
  Warnings:

  - Made the column `description` on table `events` required. This step will fail if there are existing NULL values in that column.
  - Made the column `image` on table `events` required. This step will fail if there are existing NULL values in that column.
  - Made the column `location` on table `events` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "events" ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "image" SET NOT NULL,
ALTER COLUMN "location" SET NOT NULL;
