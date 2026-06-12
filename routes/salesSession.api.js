const express = require('express')
const router = express.Router()

//controllers 
const salesSessionController = require("../controller/salesSession.controller")

//middleware
const authMiddleware = require("../middlewares/auth.middleware");
const salesSessionMiddleware = require("../middlewares/salesSession.middleware")
//validator
const validate = require("../middlewares/validate.middleware");
//API Validators
const salesSessionValidator = require("../validators/salesSession.validation")

router.post("/",authMiddleware,validate(salesSessionValidator.openSalesSessionSchema),salesSessionController.createSalesSession)
router.patch("/",authMiddleware,validate(salesSessionValidator.closeSalesSessionSchema),salesSessionMiddleware,salesSessionController.closeTodaySession)
router.get("/today",authMiddleware,salesSessionController.getTodaySession)
router.get("/overview",authMiddleware,validate(salesSessionValidator.getSalesSessionOverviewSchema),salesSessionController.getSalesSessionOverview)
module.exports = router