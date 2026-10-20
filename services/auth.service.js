const bcrypt = require("bcryptjs");
const ApiError = require("../helpers/ApiError");
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} = require("../helpers/token");

const prisma = require("../lib/prisma");
const { sendPasswordResetEmail } = require("./mailer.service");

const REFRESH_TOKEN_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_EXPIRES_IN_MS = 60 * 60 * 1000; // 1 hour

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  shopId: user.shopId,
  isActive: user.isActive,
});

const login = async ({ email, password, userAgent, ipAddress }) => {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : email;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
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

  if (!storedToken || storedToken.revokedAt) {
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

/**
 * Send a password-reset link to the user's email.
 * Always responds with the same message to avoid user enumeration.
 */
const resetLink = async ({ email }) => {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : email;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Always respond identically — do not leak whether the email exists
  if (!user || !user.isActive) {
    return { message: "The mail is succesfully sent to the registered Email ID" };
  }

  // Invalidate any existing unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  // Generate a new secure token
  const rawToken = generateRefreshToken(); // 64-byte hex string
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_IN_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      used: false,
    },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail(user.email, resetUrl);

  return { message: "If that email is registered, a reset link has been sent." };
};

/**
 * Validate that a reset token is genuine, unexpired, and unused.
 * Used by the frontend "landed on reset page" step before showing the form.
 */
const resetlinkValidate = async ({ token }) => {
  if (!token) {
    throw new ApiError(400, "Token is required");
  }

  const tokenHash = hashToken(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.used || record.expiresAt < new Date()) {
    throw new ApiError(400, "Reset link is invalid or has expired");
  }

  return { valid: true };
};

/**
 * Reset the user's password using a valid token.
 */
const resetPassword = async ({ token, newPassword }) => {
  if (!token) {
    throw new ApiError(400, "Token is required");
  }
  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  const tokenHash = hashToken(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.used || record.expiresAt < new Date()) {
    throw new ApiError(400, "Reset link is invalid or has expired");
  }

  if (!record.user.isActive) {
    throw new ApiError(403, "Account is inactive");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  if(await bcrypt.compare(newPassword, record.user.password)){
    throw new ApiError(400, "That’s the password you’re already using. Please choose a new one.");
  }

  await prisma.$transaction([
    // Mark token as used
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    }),
    // Update the user's password
    prisma.user.update({
      where: { id: record.userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    }),
    // Revoke all refresh tokens (force re-login everywhere)
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { message: "Password reset successfully. Please log in with your new password." };
};

module.exports = {
  login,
  refresh,
  logout,
  resetLink,
  resetlinkValidate,
  resetPassword,
};
