/*
  Warnings:

  - The values [PREPARING,READY,DELIVERED] on the enum `KotStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[session_id,order_no]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "KotStatus_new" AS ENUM ('NEW', 'PRINTED', 'REPRINTED', 'CANCELLED');
ALTER TABLE "public"."kots" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."orders" ALTER COLUMN "kot_status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "kot_status" TYPE "KotStatus_new" USING ("kot_status"::text::"KotStatus_new");
ALTER TABLE "kots" ALTER COLUMN "status" TYPE "KotStatus_new" USING ("status"::text::"KotStatus_new");
ALTER TYPE "KotStatus" RENAME TO "KotStatus_old";
ALTER TYPE "KotStatus_new" RENAME TO "KotStatus";
DROP TYPE "public"."KotStatus_old";
ALTER TABLE "kots" ALTER COLUMN "status" SET DEFAULT 'PRINTED';
ALTER TABLE "orders" ALTER COLUMN "kot_status" SET DEFAULT 'NEW';
COMMIT;

-- DropIndex
DROP INDEX "orders_shop_id_order_no_key";

-- CreateIndex
CREATE UNIQUE INDEX "orders_session_id_order_no_key" ON "orders"("session_id", "order_no");
