/*
  Warnings:

  - A unique constraint covering the columns `[session_id,kot_no]` on the table `kots` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `session_id` to the `kots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_id` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "kots_shop_id_kot_no_key";

-- AlterTable
ALTER TABLE "kots" ADD COLUMN     "session_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "session_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "kots_session_id_idx" ON "kots"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "kots_session_id_kot_no_key" ON "kots"("session_id", "kot_no");

-- CreateIndex
CREATE INDEX "payments_session_id_idx" ON "payments"("session_id");

-- AddForeignKey
ALTER TABLE "kots" ADD CONSTRAINT "kots_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sales_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sales_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
