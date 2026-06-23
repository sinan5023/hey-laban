const express = require("express");
const router = express.Router();

const validate = require("../middlewares/validate.middleware");
const authMiddleware = require("../middlewares/auth.middleware");

const {
  createRawMaterialSchema,
  setRawMaterialStockSchema,
  listRawMaterialsSchema,
} = require("../validators/raw-material.validation");

const rawMaterialController = require("../controller/raw-material.controller");

router.post("/", authMiddleware, validate(createRawMaterialSchema), rawMaterialController.createRawMaterial);
router.get("/", authMiddleware, validate(listRawMaterialsSchema), rawMaterialController.listRawMaterials);
router.post("/:id/stock", authMiddleware, validate(setRawMaterialStockSchema), rawMaterialController.setStock);

module.exports = router;
