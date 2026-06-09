/*
  Warnings:

  - You are about to drop the column `date` on the `Unitilizer` table. All the data in the column will be lost.
  - Added the required column `open_at` to the `Unitilizer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Unitilizer" DROP COLUMN "date",
ADD COLUMN     "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "open_at" TIMESTAMP(3) NOT NULL;
