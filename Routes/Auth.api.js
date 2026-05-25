const express = require("express");
const router = express.Router();
// controllers
const AuthController = require("../controller/auth.controller");
//validator
const validate = require("../middlewares/validate.middleware");
//API Validators
const { loginSchema } = require("../validators/auth.validation");
//Auth Middleware
const authMiddleware = require("../middlewares/auth.middleware");

router.post("/login", validate(loginSchema), AuthController.login);
router.post("/logout", AuthController.logout);
router.post("/refresh", AuthController.refresh);

module.exports = router;
