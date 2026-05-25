-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CASHIER');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('COGS', 'SALARY', 'RENT', 'ELECTRICITY', 'PACKAGING', 'MISCELLANEOUS');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED', 'DUE');

-- CreateEnum
CREATE TYPE "KotStatus" AS ENUM ('NEW', 'PRINTED', 'PREPARING', 'READY', 'DELIVERED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('COMPLETED', 'REFUNDED', 'FAILED');

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "category_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_sessions" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'OPEN',
    "opening_cash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "opening_note" TEXT,
    "opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_by" UUID NOT NULL,
    "closed_at" TIMESTAMPTZ(3),
    "closed_by" UUID,
    "closing_note" TEXT,
    "allowed_closing_time" TIME(0),

    CONSTRAINT "sales_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_expenses" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "type" "ExpenseType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "order_no" TEXT NOT NULL,
    "token_no" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "kot_status" "KotStatus" NOT NULL DEFAULT 'NEW',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "cancel_reason" TEXT,
    "local_id" TEXT,
    "synced_at" TIMESTAMPTZ(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "total" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kots" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "kot_no" TEXT NOT NULL,
    "status" "KotStatus" NOT NULL DEFAULT 'PRINTED',
    "note" TEXT,
    "printed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "kots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kot_items" (
    "id" UUID NOT NULL,
    "kot_id" UUID NOT NULL,
    "product_id" UUID,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "note" TEXT,

    CONSTRAINT "kot_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference_no" TEXT,
    "cash_tendered" DECIMAL(12,2),
    "change_amount" DECIMAL(12,2),
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_counters" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "last_token" INTEGER NOT NULL DEFAULT 0,
    "last_order" INTEGER NOT NULL DEFAULT 0,
    "last_kot" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_shop_id_idx" ON "users"("shop_id");

-- CreateIndex
CREATE INDEX "users_shop_id_role_idx" ON "users"("shop_id", "role");

-- CreateIndex
CREATE INDEX "users_shop_id_is_active_idx" ON "users"("shop_id", "is_active");

-- CreateIndex
CREATE INDEX "categories_shop_id_idx" ON "categories"("shop_id");

-- CreateIndex
CREATE INDEX "categories_shop_id_is_active_idx" ON "categories"("shop_id", "is_active");

-- CreateIndex
CREATE INDEX "categories_shop_id_sort_order_idx" ON "categories"("shop_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "categories_shop_id_name_key" ON "categories"("shop_id", "name");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "products_category_id_is_active_idx" ON "products"("category_id", "is_active");

-- CreateIndex
CREATE INDEX "products_category_id_sort_order_idx" ON "products"("category_id", "sort_order");

-- CreateIndex
CREATE INDEX "sales_sessions_shop_id_status_idx" ON "sales_sessions"("shop_id", "status");

-- CreateIndex
CREATE INDEX "sales_sessions_shop_id_opened_at_idx" ON "sales_sessions"("shop_id", "opened_at");

-- CreateIndex
CREATE INDEX "sales_sessions_opened_by_idx" ON "sales_sessions"("opened_by");

-- CreateIndex
CREATE INDEX "sales_sessions_closed_by_idx" ON "sales_sessions"("closed_by");

-- CreateIndex
CREATE UNIQUE INDEX "sales_sessions_shop_id_date_key" ON "sales_sessions"("shop_id", "date");

-- CreateIndex
CREATE INDEX "session_expenses_shop_id_type_idx" ON "session_expenses"("shop_id", "type");

-- CreateIndex
CREATE INDEX "session_expenses_session_id_idx" ON "session_expenses"("session_id");

-- CreateIndex
CREATE INDEX "session_expenses_created_at_idx" ON "session_expenses"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "session_expenses_session_id_type_key" ON "session_expenses"("session_id", "type");

-- CreateIndex
CREATE INDEX "orders_shop_id_created_at_idx" ON "orders"("shop_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_shop_id_status_idx" ON "orders"("shop_id", "status");

-- CreateIndex
CREATE INDEX "orders_shop_id_token_no_idx" ON "orders"("shop_id", "token_no");

-- CreateIndex
CREATE INDEX "orders_session_id_idx" ON "orders"("session_id");

-- CreateIndex
CREATE INDEX "orders_session_id_token_no_idx" ON "orders"("session_id", "token_no");

-- CreateIndex
CREATE INDEX "orders_session_id_status_idx" ON "orders"("session_id", "status");

-- CreateIndex
CREATE INDEX "orders_created_by_idx" ON "orders"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "orders_shop_id_order_no_key" ON "orders"("shop_id", "order_no");

-- CreateIndex
CREATE UNIQUE INDEX "orders_session_id_token_no_key" ON "orders"("session_id", "token_no");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "kots_shop_id_printed_at_idx" ON "kots"("shop_id", "printed_at");

-- CreateIndex
CREATE INDEX "kots_shop_id_status_idx" ON "kots"("shop_id", "status");

-- CreateIndex
CREATE INDEX "kots_order_id_idx" ON "kots"("order_id");

-- CreateIndex
CREATE INDEX "kots_created_by_idx" ON "kots"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "kots_shop_id_kot_no_key" ON "kots"("shop_id", "kot_no");

-- CreateIndex
CREATE INDEX "kot_items_kot_id_idx" ON "kot_items"("kot_id");

-- CreateIndex
CREATE INDEX "kot_items_product_id_idx" ON "kot_items"("product_id");

-- CreateIndex
CREATE INDEX "payments_shop_id_created_at_idx" ON "payments"("shop_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_shop_id_method_idx" ON "payments"("shop_id", "method");

-- CreateIndex
CREATE INDEX "payments_shop_id_status_idx" ON "payments"("shop_id", "status");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_created_by_idx" ON "payments"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "daily_counters_shop_id_date_key" ON "daily_counters"("shop_id", "date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_sessions" ADD CONSTRAINT "sales_sessions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_sessions" ADD CONSTRAINT "sales_sessions_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_sessions" ADD CONSTRAINT "sales_sessions_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_expenses" ADD CONSTRAINT "session_expenses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sales_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_expenses" ADD CONSTRAINT "session_expenses_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_expenses" ADD CONSTRAINT "session_expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sales_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kots" ADD CONSTRAINT "kots_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kots" ADD CONSTRAINT "kots_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kots" ADD CONSTRAINT "kots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kot_items" ADD CONSTRAINT "kot_items_kot_id_fkey" FOREIGN KEY ("kot_id") REFERENCES "kots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kot_items" ADD CONSTRAINT "kot_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_counters" ADD CONSTRAINT "daily_counters_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
