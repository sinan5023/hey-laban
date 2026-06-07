const express = require("express");
const router = express.Router();
//controllers
const reportController = require("../controller/reports.controller");
//middlewares
const authMiddleware = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
//validators

const { overviewReportSchema,reportOrdersSchema } = require("../validators/reports.validation");

router.get(
  "/overview",
  authMiddleware,
  validate(overviewReportSchema),
  reportController.getOverviewReport,
);
router.get(
  "/orders",
  authMiddleware,
  validate(reportOrdersSchema),
  reportController.getReportOrders,
);

module.exports = router;
