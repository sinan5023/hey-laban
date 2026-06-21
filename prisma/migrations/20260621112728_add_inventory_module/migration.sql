-- CreateEnum
CREATE TYPE "InventoryChangeType" AS ENUM ('MANUAL_SET', 'STOCK_IN', 'ORDER_DEDUCTION', 'ORDER_EDIT_DEDUCTION', 'ORDER_CANCEL_RESTORE');

-- CreateTable
CREATE TABLE "inventory" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "in_hand_count" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reorder_level" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_logs" (
    "id" UUID NOT NULL,
    "inventory_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "change_type" "InventoryChangeType" NOT NULL,
    "quantity_before" DECIMAL(12,2) NOT NULL,
    "quantity_change" DECIMAL(12,2) NOT NULL,
    "quantity_after" DECIMAL(12,2) NOT NULL,
    "reference_id" TEXT,
    "note" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_product_id_key" ON "inventory"("product_id");

-- CreateIndex
CREATE INDEX "inventory_shop_id_idx" ON "inventory"("shop_id");

-- CreateIndex
CREATE INDEX "inventory_product_id_idx" ON "inventory"("product_id");

-- CreateIndex
CREATE INDEX "inventory_logs_inventory_id_idx" ON "inventory_logs"("inventory_id");

-- CreateIndex
CREATE INDEX "inventory_logs_product_id_idx" ON "inventory_logs"("product_id");

-- CreateIndex
CREATE INDEX "inventory_logs_change_type_idx" ON "inventory_logs"("change_type");

-- CreateIndex
CREATE INDEX "inventory_logs_reference_id_idx" ON "inventory_logs"("reference_id");

-- CreateIndex
CREATE INDEX "inventory_logs_created_at_idx" ON "inventory_logs"("created_at");

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
