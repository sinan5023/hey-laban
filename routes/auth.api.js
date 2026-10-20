const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

// Controllers
const AuthController = require("../controller/auth.controller");

// Validators
const validate = require("../middlewares/validate.middleware");
const {
  loginSchema,
  resetLinkSchema,
  resetLinkValidateSchema,
  resetPasswordSchema,
} = require("../validators/auth.validation");

// ── Rate limiter: max 3 reset-link requests per IP per 2 hours ──────────────
const resetLinkLimiter = rateLimit({
  windowMs: 2 * 60 * 60 * 1000, // 2 hours
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many reset requests from this IP. Please try again in 2 hours.",
  },
});

// Auth routes
router.post("/login", validate(loginSchema), AuthController.login);
router.post("/logout", AuthController.logout);
router.post("/refresh", AuthController.refresh);

// Password reset routes
router.post("/reset", validate(resetLinkSchema), AuthController.resetLink);
router.get("/reset-password/validate", validate(resetLinkValidateSchema), AuthController.resetlinkValidate);
router.post("/reset-password", validate(resetPasswordSchema), AuthController.resetPassword);

module.exports = router;
