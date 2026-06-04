const { sendSuccess } = require('../helpers/response')
const profileService = require('../services/profile.service')
const ApiError = require('../helpers/ApiError')

const changePasswordController = async (req, res, next) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      throw new ApiError(401, 'Unauthorized')
    }
    const servicePayload = {
      userId,
      oldPassword: req.body.oldPassword,
      newPassword: req.body.newPassword,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
    }

    const result = await profileService.changePasswordService(servicePayload)

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Password changed successfully. Please sign in again on other devices.',
      data: result,
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  changePasswordController,
}