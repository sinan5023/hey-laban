// items.routes.js - Endpoint definitions with validation
const express = require("express");
const router = express.Router();

// Controller
const itemsController = require("../controller/items.controller");

// Auth Middleware
const authMiddleware = require("../middlewares/auth.middleware");

// Validation Middleware
const validate = require("../middlewares/validate.middleware");

// Validation Schemas
const {
  getCatalogueSchema,
  createItemSchema,
  updateItemSchema,
  deleteItemSchema,
  toggleItemInactiveSchema,
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  toggleCategoryInactiveSchema,
} = require("../validators/items.validation");

// ========== CATALOGUE (existing) ==========
router.get("/catalogue",authMiddleware, validate(getCatalogueSchema), itemsController.getCatalogue);

// ========== PRODUCTS ==========
router.get("/catalogue/management",authMiddleware,validate(getCatalogueSchema),itemsController.getManagementCatalogue)
router.post("/items", authMiddleware, validate(createItemSchema), itemsController.createItem);
router.patch("/items/:id", authMiddleware, validate(updateItemSchema), itemsController.updateItem);
router.delete("/items/:id", authMiddleware, validate(deleteItemSchema), itemsController.deleteItem);
router.patch("/items/:id/inactive", authMiddleware, validate(toggleItemInactiveSchema), itemsController.toggleItemInactive);

// ========== CATEGORIES ==========
router.post("/categories", authMiddleware, validate(createCategorySchema), itemsController.createCategory);
router.patch("/categories/:id", authMiddleware, validate(updateCategorySchema), itemsController.updateCategory);
router.delete("/categories/:id", authMiddleware, validate(deleteCategorySchema), itemsController.deleteCategory);
router.patch("/categories/:id/inactive", authMiddleware, validate(toggleCategoryInactiveSchema), itemsController.toggleCategoryInactive);

module.exports = router;