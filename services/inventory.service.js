const prisma = require("../lib/prisma");
const ApiError = require("../helpers/ApiError");

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert the inventory row for a single product.
 *
 * Optimisations:
 *  - Product validation and current-inventory reads run in parallel (Promise.all)
 *    before the transaction opens, so the transaction only holds write locks.
 *  - The upsert and log write are the only two sequential DB operations inside
 *    the transaction (they must be sequential because the log needs the upserted id).
 *
 * Only active products belonging to the authenticated shop are allowed.
 */
const setInventory = async ({ productId, shopId, addQuantity, setQuantity, reorderLevel, note, createdById }) => {
  // Run product validation + inventory snapshot in parallel (both are reads, no tx needed yet)
  const [product, existing] = await Promise.all([
    prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
        category: { shopId },
      },
      select: { id: true },
    }),
    prisma.inventory.findUnique({
      where: { productId },
      select: { id: true, inHandCount: true },
    }),
  ]);

  if (!product) {
    throw new ApiError(404, "Product not found, inactive, or does not belong to this shop");
  }

  const quantityBefore = existing ? Number(existing.inHandCount) : 0;

  let quantityAfter;
  let changeType;

  if (addQuantity !== undefined) {
    // Relative increment — new batch, stock delivery, etc.
    quantityAfter = quantityBefore + Number(addQuantity);
    changeType = "STOCK_IN";
  } else {
    // Absolute override — physical stock count correction
    quantityAfter = Number(setQuantity);
    changeType = "MANUAL_SET";
  }

  const quantityChange = quantityAfter - quantityBefore;

  // Transaction holds only write operations — keeps lock window minimal
  return await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.upsert({
      where: { productId },
      update: {
        inHandCount: quantityAfter,
        ...(reorderLevel !== undefined && { reorderLevel }),
      },
      create: {
        shopId,
        productId,
        inHandCount: quantityAfter,
        reorderLevel: reorderLevel ?? 0,
      },
    });

    await tx.inventoryLog.create({
      data: {
        inventoryId: inventory.id,
        productId,
        changeType,
        quantityBefore,
        quantityChange,
        quantityAfter,
        note: note || null,
        createdById: createdById || null,
        referenceId: null,
      },
    });

    return {
      productId: inventory.productId,
      inHandCount: Number(inventory.inHandCount),
      reorderLevel: Number(inventory.reorderLevel),
      updatedAt: inventory.updatedAt,
    };
  });
};

/**
 * Return all inventory rows for a shop.
 * Returns: [ { productId, inHandCount, reorderLevel, updatedAt } ]
 */
const listInventory = async ({ shopId }) => {
  const rows = await prisma.inventory.findMany({
    where: { shopId },
    select: {
      productId: true,
      inHandCount: true,
      reorderLevel: true,
      updatedAt: true,
      product: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          isActive: true,
          sortOrder: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((row) => ({
    productId: row.productId,
    inHandCount: Number(row.inHandCount),
    reorderLevel: Number(row.reorderLevel),
    updatedAt: row.updatedAt,
    product: {
      id: row.product.id,
      name: row.product.name,
      description: row.product.description,
      price: Number(row.product.price),
      isActive: row.product.isActive,
      sortOrder: row.product.sortOrder,
      categoryId: row.product.category?.id ?? null,
      categoryName: row.product.category?.name ?? null,
    },
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers — called inside existing order transactions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a per-product quantity map, aggregating quantities if the same productId
 * appears more than once in `items` (e.g. two line items for the same product).
 *
 * @param {Array}  items  - [{ productId, quantity }]
 * @param {number} sign   - +1 to add, -1 to subtract
 */
function _buildQuantityMap(items, sign) {
  const map = new Map(); // productId → signed total
  for (const item of items) {
    if (!item.productId) continue;
    map.set(item.productId, (map.get(item.productId) || 0) + sign * Number(item.quantity));
  }
  return map;
}

/**
 * Core function that applies a pre-built quantity map to inventory rows and
 * writes the audit logs — all inside an existing transaction.
 *
 * Optimisations:
 *  - All inventory UPDATE statements fire concurrently via Promise.all
 *  - All log rows are inserted in a single createMany call
 *
 * @param {object} tx           - Prisma transaction client
 * @param {Map}    quantityMap  - productId → signed quantity change
 * @param {Array}  invRows      - inventory rows fetched by the caller
 * @param {string} changeType   - InventoryChangeType enum value
 * @param {string} referenceId  - orderId (stored in log)
 */
async function _applyInventoryChanges(tx, quantityMap, invRows, changeType, referenceId) {
  const updates = [];
  const logData = [];

  for (const inv of invRows) {
    const delta = quantityMap.get(inv.productId);
    if (delta === undefined) continue;

    const quantityBefore = Number(inv.inHandCount);
    const quantityAfter  = quantityBefore + delta;

    if (quantityAfter < 0) {
      throw new ApiError(400, `Insufficient stock for ${inv.product.name}. Available: ${quantityBefore}, Requested: ${Math.abs(delta)}`);
    }

    updates.push(
      tx.inventory.update({
        where: { id: inv.id },
        data: { inHandCount: quantityAfter },
      })
    );

    logData.push({
      inventoryId:    inv.id,
      productId:      inv.productId,
      changeType,
      quantityBefore,
      quantityChange: delta,
      quantityAfter,
      referenceId:    referenceId || null,
      note:           null,
      createdById:    null,
    });
  }

  if (updates.length === 0) return;

  // Fire all row updates concurrently, then batch-insert logs
  await Promise.all(updates);
  await tx.inventoryLog.createMany({ data: logData });
}

/**
 * Deduct inventory for a list of order items (ORDER_DEDUCTION or ORDER_EDIT_DEDUCTION).
 * Runs inside an existing Prisma transaction.
 * Products without an inventory row are silently skipped.
 */
const deductInventoryForOrder = async (tx, items, referenceId, changeType) => {
  const quantityMap = _buildQuantityMap(items, -1); // negative = deduction
  if (quantityMap.size === 0) return;

  const invRows = await tx.inventory.findMany({
    where: { productId: { in: [...quantityMap.keys()] } },
    select: { id: true, productId: true, inHandCount: true, product: { select: { name: true } } },
  });

  if (invRows.length === 0) return;

  await _applyInventoryChanges(tx, quantityMap, invRows, changeType, referenceId);
};

/**
 * Restore inventory for a list of order items (ORDER_CANCEL_RESTORE).
 * Runs inside an existing Prisma transaction.
 * Products without an inventory row are silently skipped.
 */
const restoreInventoryForOrder = async (tx, items, referenceId) => {
  const quantityMap = _buildQuantityMap(items, +1); // positive = restore
  if (quantityMap.size === 0) return;

  const invRows = await tx.inventory.findMany({
    where: { productId: { in: [...quantityMap.keys()] } },
    select: { id: true, productId: true, inHandCount: true, product: { select: { name: true } } },
  });

  if (invRows.length === 0) return;

  await _applyInventoryChanges(tx, quantityMap, invRows, "ORDER_CANCEL_RESTORE", referenceId);
};

/**
 * Atomically restores inventory for old order items and deducts for new ones.
 * Used exclusively by editOrderById.
 *
 * Optimisation: issues a SINGLE findMany covering all unique productIds from
 * both old and new items instead of two separate findMany calls, halving the
 * number of DB round-trips for the inventory look-up phase.
 *
 * @param {object} tx        - Prisma transaction client
 * @param {Array}  oldItems  - previous order items [{ productId, quantity }]
 * @param {Array}  newItems  - replacement order items [{ productId, quantity }]
 * @param {string} orderId   - stored as referenceId in logs
 */
const swapInventoryForOrderEdit = async (tx, oldItems, newItems, orderId) => {
  // Build signed maps independently
  const restoreMap = _buildQuantityMap(oldItems, +1); // old quantities to give back
  const deductMap  = _buildQuantityMap(newItems, -1); // new quantities to take away

  // Merge into a single net-change map to find all relevant productIds
  const allProductIds = new Set([...restoreMap.keys(), ...deductMap.keys()]);
  if (allProductIds.size === 0) return;

  // Single round-trip to fetch all relevant inventory rows
  const invRows = await tx.inventory.findMany({
    where: { productId: { in: [...allProductIds] } },
    select: { id: true, productId: true, inHandCount: true, product: { select: { name: true } } },
  });

  if (invRows.length === 0) return;

  // Split rows into those needed for restore vs deduct
  const restoreRows = invRows.filter((r) => restoreMap.has(r.productId));
  const deductRows  = invRows.filter((r) => deductMap.has(r.productId));

  // For products that appear in BOTH old and new items we need the updated
  // inHandCount from the restore step as the baseline for the deduct step.
  // Build a mutable running-balance map so we handle overlapping products correctly.
  const runningBalance = new Map(invRows.map((r) => [r.productId, Number(r.inHandCount)]));

  const updates = [];
  const logData = [];

  // Phase 1 — restores
  for (const inv of restoreRows) {
    const delta          = restoreMap.get(inv.productId);
    const quantityBefore = runningBalance.get(inv.productId);
    const quantityAfter  = quantityBefore + delta;
    runningBalance.set(inv.productId, quantityAfter);

    updates.push(
      tx.inventory.update({ where: { id: inv.id }, data: { inHandCount: quantityAfter } })
    );
    logData.push({
      inventoryId: inv.id, productId: inv.productId,
      changeType: "ORDER_CANCEL_RESTORE",
      quantityBefore, quantityChange: delta, quantityAfter,
      referenceId: orderId || null, note: null, createdById: null,
    });
  }

  // Phase 2 — deductions (uses updated runningBalance so overlapping products
  // get the correct quantityBefore based on the restore that just happened)
  for (const inv of deductRows) {
    const delta          = deductMap.get(inv.productId);
    const quantityBefore = runningBalance.get(inv.productId);
    const quantityAfter  = quantityBefore + delta;

    if (quantityAfter < 0) {
      throw new ApiError(400, `Insufficient stock for ${inv.product.name}. Available: ${quantityBefore}`);
    }

    runningBalance.set(inv.productId, quantityAfter);

    updates.push(
      tx.inventory.update({ where: { id: inv.id }, data: { inHandCount: quantityAfter } })
    );
    logData.push({
      inventoryId: inv.id, productId: inv.productId,
      changeType: "ORDER_EDIT_DEDUCTION",
      quantityBefore, quantityChange: delta, quantityAfter,
      referenceId: orderId || null, note: null, createdById: null,
    });
  }

  if (updates.length === 0) return;

  await Promise.all(updates);
  await tx.inventoryLog.createMany({ data: logData });
};

module.exports = {
  setInventory,
  listInventory,
  deductInventoryForOrder,
  restoreInventoryForOrder,
  swapInventoryForOrderEdit,
};
