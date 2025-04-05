/*
  Warnings:

  - Added the required column `difficulty` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "difficulty" "Difficulty" NOT NULL;
