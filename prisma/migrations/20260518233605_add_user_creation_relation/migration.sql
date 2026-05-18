-- AlterTable
ALTER TABLE "User" ADD COLUMN     "created_by_id" VARCHAR(255);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
