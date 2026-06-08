const express = require("express");
const router = express.Router();
//validator
const validate = require("../middlewares/validate.middleware");
//API Validators
const { createOrderSchema , listOrdersSchema  , getOrderByIdSchema , patchOrderSchema , cancelOrderSchema} = require("../validators/orders.validation");
const {createKotSchema} = require("../validators/orders.kot.validation")
const {addPaymentsToOrderSchema} = require("../validators/orders.payments.validation")
//Middlewares
const authMiddleware = require("../middlewares/auth.middleware");
const salesSessionMiddleware = require("../middlewares/salesSession.middleware");
//Controllers
const orderController = require("../controller/order.controller");
const kotController = require("../controller/orders.kot.controller")
const paymentsController = require("../controller/orders.payments.controller")

router.post("/",authMiddleware,salesSessionMiddleware,validate(createOrderSchema), orderController.createOrder);
router.post("/create-with-kot",authMiddleware,salesSessionMiddleware,validate(createOrderSchema), orderController.createOrderWithKot);
router.get("/",authMiddleware,salesSessionMiddleware,validate(listOrdersSchema),orderController.listOrders)
router.get("/kot",authMiddleware,salesSessionMiddleware,kotController.listKotsHandler)
router.get("/kot/:kotId",authMiddleware,salesSessionMiddleware,kotController.getKotByIdHandler)
router.get("/:orderId",authMiddleware,salesSessionMiddleware,validate(getOrderByIdSchema),orderController.getOrderById)
router.patch("/:orderId",authMiddleware,salesSessionMiddleware,validate(patchOrderSchema),orderController.editOrderById)
router.post("/:orderId/kot",authMiddleware,salesSessionMiddleware,validate(createKotSchema),kotController.createKotHandler)
router.post("/:orderId/payments",authMiddleware,salesSessionMiddleware,validate(addPaymentsToOrderSchema),paymentsController.addPaymentsToOrderHandler)
router.get("/:orderId/payments",authMiddleware,salesSessionMiddleware,paymentsController.getPaymentsByOrderIdHandler)
router.post("/:orderId/cancel",authMiddleware ,salesSessionMiddleware,validate(cancelOrderSchema),orderController.cancelOrder)



module.exports = router;
