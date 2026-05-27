/*
  Warnings:

  - A unique constraint covering the columns `[order_id]` on the table `kots` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "kots_order_id_idx";

-- AlterTable
ALTER TABLE "kots" ADD COLUMN     "times_printed" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "kots_order_id_key" ON "kots"("order_id");
