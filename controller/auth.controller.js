const authService = require("../services/auth.service");
const { sendSuccess, sendError } = require("../helpers/response");
const {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require("../helpers/cookies");

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login({
      email,
      password,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    setRefreshTokenCookie(res, result.refreshToken);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Login successful",
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const result = await authService.refresh({
      refreshToken: req.cookies.refreshToken,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    setRefreshTokenCookie(res, result.refreshToken);

    return sendSuccess(res, {
      statusCode: 200,
      message: "Access token refreshed successfully",
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return sendError(res, {
      statusCode: error.statusCode || 500,
      message: error.message || "Internal server error",
      error: error.error || null,
    });
  }
};

const logout = async (req, res, next) => {
  try {
    const result = await authService.logout({
      refreshToken: req.cookies.refreshToken,
    });

    clearRefreshTokenCookie(res);

    return sendSuccess(res, {
      statusCode: 200,
      message: result.message,
      data: null,
    });
  } catch (error) {
    console.error("Logout error:", error);
    next(error);
  }
};

// POST /auth/reset
// Accepts an email, sends the reset link. Rate-limited at the route level.
const resetLink = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.resetLink({ email });
    return sendSuccess(res, { statusCode: 200, message: result.message, data: null });
  } catch (error) {
    next(error);
  }
};

// GET /auth/reset-password/validate?token=...
// Validates that the token is genuine, unexpired, and unused.
const resetlinkValidate = async (req, res, next) => {
  try {
    const { token } = req.query;
    const result = await authService.resetlinkValidate({ token });
    return sendSuccess(res, { statusCode: 200, message: "Token is valid", data: result });
  } catch (error) {
    next(error);
  }
};

// POST /auth/reset-password
// Sets the new password and revokes all sessions.
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword({ token, newPassword });
    return sendSuccess(res, { statusCode: 200, message: result.message, data: null });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  refresh,
  logout,
  resetLink,
  resetlinkValidate,
  resetPassword,
};
