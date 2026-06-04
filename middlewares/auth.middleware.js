const { verifyAccessToken } = require("../helpers/token");
const prisma = require("../lib/prisma");
const ApiError = require("../helpers/ApiError");

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Access token required");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        passwordChangedAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, "Unauthorized");
    }

    if (user.passwordChangedAt && decoded.iat) {
      const tokenIssuedAtMs = decoded.iat * 1000;
      const passwordChangedAtMs = new Date(user.passwordChangedAt).getTime();

      if (tokenIssuedAtMs < passwordChangedAtMs) {
        throw new ApiError(401, "Session expired. Please log in again.");
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = auth;