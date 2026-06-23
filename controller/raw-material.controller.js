const rawMaterialService = require("../services/raw-material.service");
const { sendSuccess } = require("../helpers/response");

const createRawMaterial = async (req, res, next) => {
  try {
    const shopId = req.user.shopId;
    const { name, inHandCount, reorderLevel } = req.body;

    const result = await rawMaterialService.createRawMaterial({
      shopId,
      name,
      inHandCount,
      reorderLevel,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Raw material created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const setStock = async (req, res, next) => {
  try {
    const shopId = req.user.shopId;
    const { id } = req.params;
    const { addQuantity, setQuantity, reorderLevel, note } = req.body;

    const result = await rawMaterialService.setStock({
      rawMaterialId: id,
      shopId,
      addQuantity,
      setQuantity,
      reorderLevel,
      note,
      createdById: req.user.id,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Raw material stock updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const listRawMaterials = async (req, res, next) => {
  try {
    const shopId = req.user.shopId;

    const result = await rawMaterialService.listRawMaterials({ shopId });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Raw materials fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRawMaterial,
  setStock,
  listRawMaterials,
};
