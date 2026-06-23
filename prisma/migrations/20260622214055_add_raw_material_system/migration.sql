-- CreateEnum
CREATE TYPE "RawMaterialChangeType" AS ENUM ('MANUAL_SET', 'STOCK_IN', 'ORDER_DEDUCTION', 'ORDER_EDIT_DEDUCTION', 'ORDER_CANCEL_RESTORE');

-- CreateTable
CREATE TABLE "raw_materials" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "in_hand_count" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reorder_level" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "raw_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_ingredients" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "raw_material_id" UUID NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_material_logs" (
    "id" UUID NOT NULL,
    "raw_material_id" UUID NOT NULL,
    "change_type" "RawMaterialChangeType" NOT NULL,
    "quantity_before" DECIMAL(12,2) NOT NULL,
    "quantity_change" DECIMAL(12,2) NOT NULL,
    "quantity_after" DECIMAL(12,2) NOT NULL,
    "reference_id" TEXT,
    "note" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_material_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "raw_materials_shop_id_idx" ON "raw_materials"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "raw_materials_shop_id_name_key" ON "raw_materials"("shop_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "product_ingredients_product_id_key" ON "product_ingredients"("product_id");

-- CreateIndex
CREATE INDEX "product_ingredients_product_id_idx" ON "product_ingredients"("product_id");

-- CreateIndex
CREATE INDEX "product_ingredients_raw_material_id_idx" ON "product_ingredients"("raw_material_id");

-- CreateIndex
CREATE INDEX "raw_material_logs_raw_material_id_idx" ON "raw_material_logs"("raw_material_id");

-- AddForeignKey
ALTER TABLE "raw_materials" ADD CONSTRAINT "raw_materials_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_logs" ADD CONSTRAINT "raw_material_logs_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
