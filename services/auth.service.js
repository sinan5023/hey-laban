const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const ApiError = require("../helpers/ApiError");
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} = require("../helpers/token");

const prisma = require("../lib/prisma")

const REFRESH_TOKEN_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  shopId: user.shopId,
  isActive: user.isActive,
});

const login = async ({ email, password, userAgent, ipAddress }) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account is inactive");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS),
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
};

const refresh = async ({ refreshToken, userAgent, ipAddress }) => {
  if (!refreshToken) {
    throw new ApiError(401, "No refresh token");
  }

  const tokenHash = hashToken(refreshToken);

  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!storedToken) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  if (!storedToken.user.isActive) {
    throw new ApiError(403, "Account is inactive");
  }

  const newRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRefreshToken);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        userId: storedToken.userId,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS),
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
      },
    }),
  ]);

  return {
    accessToken: generateAccessToken(storedToken.user),
    refreshToken: newRefreshToken,
    user: sanitizeUser(storedToken.user),
  };
};

const logout = async ({ refreshToken }) => {
  if (!refreshToken) {
    return {
      message: "Logged out successfully",
    };
  }

  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return {
    message: "Logged out successfully",
  };
};

module.exports = {
  login,
  refresh,
  logout,
};
