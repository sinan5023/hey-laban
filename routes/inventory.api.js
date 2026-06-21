const express = require("express");
const router = express.Router();

// Validator
const validate = require("../middlewares/validate.middleware");

// API Validators
const { setInventorySchema, getInventorySchema } = require("../validators/inventory.validation");

// Middlewares
const authMiddleware = require("../middlewares/auth.middleware");

// Controller
const inventoryController = require("../controller/inventory.controller");

// POST /api/inventory/:productId — set / upsert inventory for a product
router.post("/:productId", authMiddleware, validate(setInventorySchema), inventoryController.setInventory);

// GET /api/inventory — list all products with their current inventory
router.get("/", authMiddleware, validate(getInventorySchema), inventoryController.listInventory);

module.exports = router;
