const { sendSuccess } = require("../helpers/response");
const inventoryService = require("../services/inventory.service");

/**
 * POST /api/inventory/:productId
 * Create or overwrite the in-hand count (and optionally reorder level) for a product.
 */
const setInventory = async (req, res, next) => {
  try {
    const shopId = req.user.shopId;
    const { productId } = req.params;
    const { addQuantity, setQuantity, reorderLevel, note } = req.body;

    const result = await inventoryService.setInventory({
      productId,
      shopId,
      addQuantity,
      setQuantity,
      reorderLevel,
      note: note || null,
      createdById: req.user.id,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Inventory updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("setInventory error:", error);
    next(error);
  }
};

/**
 * GET /api/inventory
 * Returns all products that have an inventory row for this shop.
 * Shape: [{ productId, inHandCount, reorderLevel, updatedAt }]
 */
const listInventory = async (req, res, next) => {
  try {
    const shopId = req.user.shopId;

    const result = await inventoryService.listInventory({ shopId });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Inventory fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("listInventory error:", error);
    next(error);
  }
};

module.exports = {
  setInventory,
  listInventory,
};
