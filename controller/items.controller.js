const itemsService = require("../services/items.service");
const { sendSuccess, sendError } = require("../helpers/response");

// ========== CATALOGUE (existing) ==========
const getCatalogue = async (req, res, next) => {
  try {
    const result = await itemsService.getCatalogue({
      shopId: req.user.shopId,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Catalogue fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get catalogue error:", error);
    next(error);
  }
};

// ========== PRODUCTS (new CRUD) ==========


const getManagementCatalogue = async (req, res, next) => {
  try {
    const result = await itemsService.getManagementCatalogue({
      shopId: req.user.shopId,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Management catalogue fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get management catalogue error:", error);
    next(error);
  }
};

const createItem = async (req, res, next) => {
  try {
    const { categoryId, name, description, price, sortOrder } = req.body;

    const result = await itemsService.createProduct({
      shopId: req.user.shopId,
      categoryId,
      name,
      description,
      price,
      sortOrder,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Product created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Create item error:", error);
    next(error);
  }
};

const updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, sortOrder, categoryId } = req.body;

    const result = await itemsService.updateProduct({
      id,
      shopId: req.user.shopId,
      name,
      description,
      price,
      sortOrder,
      categoryId,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Product updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Update item error:", error);
    next(error);
  }
};

const deleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await itemsService.deleteProduct({
      id,
      shopId: req.user.shopId,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("Delete item error:", error);
    next(error);
  }
};

const toggleItemInactive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const result = await itemsService.toggleProductInactive({
      id,
      shopId: req.user.shopId,
      isActive,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Product ${isActive ? "activated" : "disabled"} successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Toggle item inactive error:", error);
    next(error);
  }
};

// ========== CATEGORIES (new CRUD) ==========
const createCategory = async (req, res, next) => {
  try {
    const { name, sortOrder } = req.body;

    const result = await itemsService.createCategory({
      shopId: req.user.shopId,
      name,
      sortOrder,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Category created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Create category error:", error);
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sortOrder } = req.body;

    const result = await itemsService.updateCategory({
      id,
      shopId: req.user.shopId,
      name,
      sortOrder,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Category updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Update category error:", error);
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await itemsService.deleteCategory({
      id,
      shopId: req.user.shopId,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("Delete category error:", error);
    next(error);
  }
};

const toggleCategoryInactive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const result = await itemsService.toggleCategoryInactive({
      id,
      shopId: req.user.shopId,
      isActive,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: `Category ${isActive ? "activated" : "disabled"} successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Toggle category inactive error:", error);
    next(error);
  }
};

module.exports = {
  getCatalogue,
  getManagementCatalogue,
  createItem,
  updateItem,
  deleteItem,
  toggleItemInactive,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryInactive,
};