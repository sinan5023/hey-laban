const express = require("express");
const router = express.Router();

//controllers
const profileController = require("../controller/profile.controller");

//middleware
const authMiddleware = require("../middlewares/auth.middleware");
const rateLimiter = require("../middlewares/changePswdRateLimit.middleware");
//validator
const validate = require("../middlewares/validate.middleware");
// API Validator
const { changePasswordSchema } = require("../validators/changePass.profile");
router.post("/password/change", authMiddleware, validate(changePasswordSchema),rateLimiter.changePasswordIpRateLimit,rateLimiter.changePasswordUserRateLimit,profileController.changePasswordController);

module.exports = router;
