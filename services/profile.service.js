// services/profile/changePassword.service.js
const bcrypt = require('bcryptjs')
const prisma = require('../lib/prisma')
const ApiError = require('../helpers/ApiError')

const BCRYPT_ROUNDS = 12

const changePasswordService = async ({
  userId,
  oldPassword,
  newPassword,
  ipAddress,
  userAgent,
}) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      password: true,
      isActive: true,
      email: true,
    },
  })

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  if (!user.isActive) {
    throw new ApiError(403, 'User account is inactive')
  }

  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password)

  if (!isOldPasswordValid) {
    throw new ApiError(400, 'Old password is incorrect')
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password)

  if (isSamePassword) {
    throw new ApiError(400, 'New password must be different from the old password')
  }

  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  const revokedAt = new Date()
  const changedAt = new Date()

const result = await prisma.$transaction(async (tx) => {
  await tx.user.update({
    where: { id: userId },
    data: {
      password: newPasswordHash,
      passwordChangedAt: changedAt,
    },
  })

  const revokedTokens = await tx.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: changedAt,
    },
  })

  return {
    userId,
    passwordChangedAt: changedAt,
    refreshTokensRevoked: revokedTokens.count,
  }
})

  return result
}

const getShopService = async ({ shopId }) => {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      name: true,
      address: true,
      phone: true,
    },
  })

  if (!shop) {
    throw new ApiError(404, 'Shop not found')
  }

  return shop
}

module.exports = {
  changePasswordService,
  getShopService,
}