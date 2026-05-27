// controllers/kots.controller.js
const { sendSuccess, sendError } = require('../helpers/response')
const kotService = require('../services/orders.kot.service')
const ApiError = require('../helpers/apiError')

const createKotHandler = async (req, res) => {
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
    next(error)
  }
}

const getKotByIdHandler = async (req, res, next) => {
  try {
    const data = await kotService.getKotById({
      shopId: req.user.shopId,
      session: req.salesSession,
      kotId: req.params.kotId,
    })

    res.status(200).json({
      success: true,
      message: "KOT fetched successfully",
      data,
    })
  } catch (error) {
    next(error)
  }
}

const listKotsHandler = async (req, res, next) => {
  try {
    const data = await kotService.listKots({
      shopId: req.user.shopId,
      session: req.salesSession,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sortBy,
      sortDir: req.query.sortDir,
    })

    res.status(200).json({
      success: true,
      message: "KOT list fetched successfully",
      ...data,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createKotHandler,
  listKotsHandler,
  getKotByIdHandler
}