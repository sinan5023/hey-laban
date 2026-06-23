const prisma = require("../lib/prisma");
const ApiError = require("../helpers/ApiError");

// ─────────────────────────────────────────────────────────────────────────────
// Public API logic (Direct Product Inventory)
// ─────────────────────────────────────────────────────────────────────────────

const setInventory = async ({ shopId, updates, createdById }) => {
  // (Existing logic for direct product inventory management)
  const productIds = updates.map((u) => u.productId);

  const existingRows = await prisma.inventory.findMany({
    where: { shopId, productId: { in: productIds } },
  });
  const existingMap = new Map(existingRows.map((r) => [r.productId, r]));

  return await prisma.$transaction(async (tx) => {
    const updatePromises = [];
    const logData = [];

    for (const update of updates) {
      const existing = existingMap.get(update.productId);
      const quantityBefore = existing ? Number(existing.inHandCount) : 0;
      let quantityAfter;
      let changeType;

      if (update.addQuantity !== undefined) {
        quantityAfter = quantityBefore + Number(update.addQuantity);
        changeType = "STOCK_IN";
      } else {
        quantityAfter = Number(update.setQuantity);
        changeType = "MANUAL_SET";
      }

      const quantityChange = quantityAfter - quantityBefore;

      if (existing) {
        updatePromises.push(
          tx.inventory.update({
            where: { id: existing.id },
            data: {
              inHandCount: quantityAfter,
              ...(update.reorderLevel !== undefined && { reorderLevel: update.reorderLevel }),
            },
          })
        );
        logData.push({
          inventoryId: existing.id,
          productId: update.productId,
          changeType,
          quantityBefore,
          quantityChange,
          quantityAfter,
          note: update.note || null,
          createdById: createdById || null,
        });
      } else {
        const created = await tx.inventory.create({
          data: {
            shopId,
            productId: update.productId,
            inHandCount: quantityAfter,
            reorderLevel: update.reorderLevel || 0,
          },
        });
        logData.push({
          inventoryId: created.id,
          productId: update.productId,
          changeType,
          quantityBefore,
          quantityChange,
          quantityAfter,
          note: update.note || null,
          createdById: createdById || null,
        });
      }
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    if (logData.length > 0) {
      await tx.inventoryLog.createMany({ data: logData });
    }

    return { success: true };
  });
};

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
            select: { id: true, name: true },
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
// Internal helpers — Hybrid Tracking (Raw Material vs Product Inventory)
// ─────────────────────────────────────────────────────────────────────────────

function _buildQuantityMap(items, sign) {
  const map = new Map();
  for (const item of items) {
    if (!item.productId) continue;
    map.set(item.productId, (map.get(item.productId) || 0) + sign * Number(item.quantity));
  }
  return map;
}

/**
 * Resolves product deltas into their actual tracking targets (RawMaterial vs Inventory).
 * Groups identical targets to prevent race conditions during updates.
 */
async function _resolveTargets(tx, productDeltas) {
  const productIds = [...productDeltas.keys()];
  if (productIds.length === 0) return { rawMaterialDeltas: new Map(), inventoryDeltas: new Map() };

  // Find products that are linked to a raw material base
  const ingredients = await tx.productIngredient.findMany({
    where: { productId: { in: productIds } },
  });
  const ingredientMap = new Map(ingredients.map((i) => [i.productId, i.rawMaterialId]));

  const rawMaterialDeltas = new Map(); // rawMaterialId -> total delta
  const inventoryDeltas = new Map();   // productId -> total delta

  for (const [productId, delta] of productDeltas.entries()) {
    const rawMaterialId = ingredientMap.get(productId);
    if (rawMaterialId) {
      rawMaterialDeltas.set(rawMaterialId, (rawMaterialDeltas.get(rawMaterialId) || 0) + delta);
    } else {
      inventoryDeltas.set(productId, (inventoryDeltas.get(productId) || 0) + delta);
    }
  }

  return { rawMaterialDeltas, inventoryDeltas };
}

/**
 * Applies resolved deltas to the actual database rows.
 */
async function _applyResolvedChanges(tx, rawMaterialDeltas, inventoryDeltas, changeType, referenceId) {
  const updates = [];
  const invLogData = [];
  const rawLogData = [];

  // 1. Process Product Inventory Deductions
  if (inventoryDeltas.size > 0) {
    const invRows = await tx.inventory.findMany({
      where: { productId: { in: [...inventoryDeltas.keys()] } },
      select: { id: true, productId: true, inHandCount: true },
    });

    for (const inv of invRows) {
      const delta = inventoryDeltas.get(inv.productId);
      if (!delta) continue;

      const quantityBefore = Number(inv.inHandCount);
      const quantityAfter = quantityBefore + delta;

      if (quantityAfter < 0) {
        throw new ApiError(400, `Insufficient stock for product ${inv.productId}. Available: ${quantityBefore}`);
      }

      updates.push(tx.inventory.update({ where: { id: inv.id }, data: { inHandCount: quantityAfter } }));
      invLogData.push({
        inventoryId: inv.id, productId: inv.productId, changeType,
        quantityBefore, quantityChange: delta, quantityAfter,
        referenceId: referenceId || null, note: null, createdById: null,
      });
    }
  }

  // 2. Process Raw Material (Base) Deductions
  if (rawMaterialDeltas.size > 0) {
    const rawRows = await tx.rawMaterial.findMany({
      where: { id: { in: [...rawMaterialDeltas.keys()] } },
      select: { id: true, name: true, inHandCount: true },
    });

    for (const raw of rawRows) {
      const delta = rawMaterialDeltas.get(raw.id);
      if (!delta) continue;

      const quantityBefore = Number(raw.inHandCount);
      const quantityAfter = quantityBefore + delta;

      if (quantityAfter < 0) {
        throw new ApiError(400, `Insufficient base stock for ${raw.name}. Available: ${quantityBefore}`);
      }

      updates.push(tx.rawMaterial.update({ where: { id: raw.id }, data: { inHandCount: quantityAfter } }));
      rawLogData.push({
        rawMaterialId: raw.id, changeType,
        quantityBefore, quantityChange: delta, quantityAfter,
        referenceId: referenceId || null, note: null, createdById: null,
      });
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }
  if (invLogData.length > 0) {
    await tx.inventoryLog.createMany({ data: invLogData });
  }
  if (rawLogData.length > 0) {
    await tx.rawMaterialLog.createMany({ data: rawLogData });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported Order Hooks
// ─────────────────────────────────────────────────────────────────────────────

const deductInventoryForOrder = async (tx, items, referenceId, changeType) => {
  const productDeltas = _buildQuantityMap(items, -1);
  if (productDeltas.size === 0) return;

  const { rawMaterialDeltas, inventoryDeltas } = await _resolveTargets(tx, productDeltas);
  await _applyResolvedChanges(tx, rawMaterialDeltas, inventoryDeltas, changeType, referenceId);
};

const restoreInventoryForOrder = async (tx, items, referenceId) => {
  const productDeltas = _buildQuantityMap(items, +1);
  if (productDeltas.size === 0) return;

  const { rawMaterialDeltas, inventoryDeltas } = await _resolveTargets(tx, productDeltas);
  await _applyResolvedChanges(tx, rawMaterialDeltas, inventoryDeltas, "ORDER_CANCEL_RESTORE", referenceId);
};

const swapInventoryForOrderEdit = async (tx, oldItems, newItems, orderId) => {
  // Calculate NET difference directly.
  // Old items = we restore (+1), New items = we deduct (-1)
  const netDeltas = new Map();

  for (const item of oldItems) {
    if (!item.productId) continue;
    netDeltas.set(item.productId, (netDeltas.get(item.productId) || 0) + Number(item.quantity));
  }
  for (const item of newItems) {
    if (!item.productId) continue;
    netDeltas.set(item.productId, (netDeltas.get(item.productId) || 0) - Number(item.quantity));
  }

  // Remove zero-net changes
  for (const [productId, delta] of netDeltas.entries()) {
    if (delta === 0) netDeltas.delete(productId);
  }

  if (netDeltas.size === 0) return;

  // Resolve to bases/inventory
  const { rawMaterialDeltas, inventoryDeltas } = await _resolveTargets(tx, netDeltas);

  // Apply the net changes (a single combined step ensures we don't trip 
  // temporary negative balances if the net balance is positive)
  await _applyResolvedChanges(tx, rawMaterialDeltas, inventoryDeltas, "ORDER_EDIT_DEDUCTION", orderId);
};

module.exports = {
  setInventory,
  listInventory,
  deductInventoryForOrder,
  restoreInventoryForOrder,
  swapInventoryForOrderEdit,
};
