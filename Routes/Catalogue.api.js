const express = require("express");
const router = express.Router();
//Controller
const catalogueController = require("../controller/catalogue.controller");
//Auth Middleware
const authMiddleware = require("../middlewares/auth.middleware");


router.get("/catalogue", authMiddleware, catalogueController.getCatalogue);

module.exports = router;
