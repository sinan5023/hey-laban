const express = require("express");
const router = express.Router();
//validator
const validate = require("../middlewares/validate.middleware");
//API Validators
const { createOrderSchema , listOrdersSchema  , getOrderByIdSchema , patchOrderSchema} = require("../validators/orders.validation");
const {createKotSchema} = require("../validators/orders.kot.validation")
//Middlewares
const authMiddleware = require("../middlewares/auth.middleware");
const salesSessionMiddleware = require("../middlewares/salesSession.middleware");
//Controllers
const orderController = require("../controller/order.controller");
const kotController = require("../controller/orders.kot.controller")

router.post("/",authMiddleware,salesSessionMiddleware,validate(createOrderSchema), orderController.createOrder);
router.get("/",authMiddleware,salesSessionMiddleware,validate(listOrdersSchema),orderController.listOrders)
router.get("/:orderId",authMiddleware,salesSessionMiddleware,validate(getOrderByIdSchema),orderController.getOrderById)
router.patch("/:orderId",authMiddleware,salesSessionMiddleware,validate(patchOrderSchema),orderController.editOrderById)
router.post("/:orderId/kot",authMiddleware,salesSessionMiddleware,validate(createKotSchema),kotController.createKot)




module.exports = router;
