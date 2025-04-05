-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_assessmentId_fkey";

-- AlterTable
ALTER TABLE "Question" ALTER COLUMN "assessmentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
