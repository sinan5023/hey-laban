// controllers/kots.controller.js
const { sendSuccess, sendError } = require('../helpers/response')
const kotService = require('../services/orders.kot.service')
const ApiError = require('../helpers/apiError')

const createKot = async (req, res) => {
  try {
    const orderId = req.params.orderId
    const note = req.body?.note ?? null
    const shopId = req.user.shopId
    const createdById = req.user.id
    const salesSessionId = req.salesSession?.id ?? null

    const kot = await kotService.createKot({
      shopId,
      orderId,
      note,
      createdById,
      salesSessionId,
    })

    return sendSuccess(res, {
      statusCode: 201,
      message: 'KOT created successfully',
      data: kot,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return sendError(res, {
        statusCode: error.statusCode,
        message: error.message,
        error: error.error,
      })
    }

    return sendError(res, {
      message: 'Failed to create KOT',
    })
  }
}

module.exports = {
  createKot,
}