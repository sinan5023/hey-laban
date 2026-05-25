const authService = require("../services/auth.service");
const { sendSuccess, sendError } = require("../helpers/response");
const {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require("../helpers/cookies");

const login = async (req, res) => {
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

    return sendError(res, {
      statusCode: error.statusCode || 500,
      message: error.message || "Internal server error",
      error: error.error || null,
    });
  }
};

const refresh = async (req, res) => {
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

const logout = async (req, res) => {
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

    return sendError(res, {
      statusCode: error.statusCode || 500,
      message: error.message || "Internal server error",
      error: error.error || null,
    });
  }
};

module.exports = {
  login,
  refresh,
  logout,
};
