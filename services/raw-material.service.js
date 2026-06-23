const prisma = require("../lib/prisma");
const ApiError = require("../helpers/ApiError");

const createRawMaterial = async ({ shopId, name, inHandCount, reorderLevel }) => {
  const existing = await prisma.rawMaterial.findFirst({
    where: { shopId, name: { equals: name, mode: "insensitive" } },
  });

  if (existing) {
    throw new ApiError(400, "A raw material with this name already exists");
  }

  return await prisma.$transaction(async (tx) => {
    const rawMaterial = await tx.rawMaterial.create({
      data: {
        shopId,
        name,
        inHandCount,
        reorderLevel,
      },
    });

    if (inHandCount > 0) {
      await tx.rawMaterialLog.create({
        data: {
          rawMaterialId: rawMaterial.id,
          changeType: "MANUAL_SET",
          quantityBefore: 0,
          quantityChange: inHandCount,
          quantityAfter: inHandCount,
          note: "Initial stock setup",
        },
      });
    }

    return rawMaterial;
  });
};

const setStock = async ({ rawMaterialId, shopId, addQuantity, setQuantity, reorderLevel, note, createdById }) => {
  const existing = await prisma.rawMaterial.findFirst({
    where: { id: rawMaterialId, shopId },
  });

  if (!existing) {
    throw new ApiError(404, "Raw material not found");
  }

  const quantityBefore = Number(existing.inHandCount);
  let quantityAfter;
  let changeType;

  if (addQuantity !== undefined) {
    quantityAfter = quantityBefore + Number(addQuantity);
    changeType = "STOCK_IN";
  } else {
    quantityAfter = Number(setQuantity);
    changeType = "MANUAL_SET";
  }

  const quantityChange = quantityAfter - quantityBefore;

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.rawMaterial.update({
      where: { id: rawMaterialId },
      data: {
        inHandCount: quantityAfter,
        ...(reorderLevel !== undefined && { reorderLevel }),
      },
    });

    await tx.rawMaterialLog.create({
      data: {
        rawMaterialId,
        changeType,
        quantityBefore,
        quantityChange,
        quantityAfter,
        note: note || null,
        createdById: createdById || null,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      inHandCount: Number(updated.inHandCount),
      reorderLevel: Number(updated.reorderLevel),
      updatedAt: updated.updatedAt,
    };
  });
};

const listRawMaterials = async ({ shopId }) => {
  const rows = await prisma.rawMaterial.findMany({
    where: { shopId },
    include: {
      productIngredients: {
        include: {
          product: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    inHandCount: Number(row.inHandCount),
    reorderLevel: Number(row.reorderLevel),
    updatedAt: row.updatedAt,
    linkedProducts: row.productIngredients.map((pi) => pi.product),
  }));
};

module.exports = {
  createRawMaterial,
  setStock,
  listRawMaterials,
};
