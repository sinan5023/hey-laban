-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKEOUT', 'DELIVERY');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "order_type" "OrderType" NOT NULL DEFAULT 'DINE_IN';
