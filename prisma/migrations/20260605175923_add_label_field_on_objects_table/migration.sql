/*
  Warnings:

  - Added the required column `label` to the `Objects` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Objects" ADD COLUMN     "label" VARCHAR(100) NOT NULL;
