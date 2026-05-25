/*
  Warnings:

  - You are about to drop the `session_expenses` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ExpenseEntryType" AS ENUM ('SESSION', 'PERIODIC');

-- DropForeignKey
ALTER TABLE "session_expenses" DROP CONSTRAINT "session_expenses_created_by_fkey";

-- DropForeignKey
ALTER TABLE "session_expenses" DROP CONSTRAINT "session_expenses_session_id_fkey";

-- DropForeignKey
ALTER TABLE "session_expenses" DROP CONSTRAINT "session_expenses_shop_id_fkey";

-- DropTable
DROP TABLE "session_expenses";

-- DropEnum
DROP TYPE "ExpenseType";

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "session_id" UUID,
    "entry_type" "ExpenseEntryType" NOT NULL,
    "category_name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "expense_date" DATE NOT NULL,
    "period_start" DATE,
    "period_end" DATE,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_shop_id_entry_type_idx" ON "expenses"("shop_id", "entry_type");

-- CreateIndex
CREATE INDEX "expenses_shop_id_expense_date_idx" ON "expenses"("shop_id", "expense_date");

-- CreateIndex
CREATE INDEX "expenses_shop_id_category_name_idx" ON "expenses"("shop_id", "category_name");

-- CreateIndex
CREATE INDEX "expenses_session_id_idx" ON "expenses"("session_id");

-- CreateIndex
CREATE INDEX "expenses_created_by_idx" ON "expenses"("created_by");

-- CreateIndex
CREATE INDEX "expenses_period_start_period_end_idx" ON "expenses"("period_start", "period_end");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sales_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
