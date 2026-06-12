const express = require("express");
const router = express.Router();

// controllers
const reportController = require("../controller/reports.controller");

// middlewares
const authMiddleware = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");

// validators
const {
  sessionOrDateRangeSchema,
  reportOrdersSchema,
  closedSalesSessionsSchema,
} = require("../validators/reports.validation");

router.get(
  "/sales-session",
  authMiddleware,
  validate(closedSalesSessionsSchema),
  reportController.getClosedSalesSessions,
);

router.get(
  "/orders",
  authMiddleware,
  validate(reportOrdersSchema),
  reportController.getReportOrders,
);

router.get(
  "/sales-summary",
  authMiddleware,
  validate(sessionOrDateRangeSchema),
  reportController.getSalesSummary,
);

router.get(
  "/business-report",
  authMiddleware,
  validate(sessionOrDateRangeSchema),
  reportController.getBusinessReport,
);

module.exports = router;
