const reportService = require('../services/reports.service')
const { sendSuccess } = require('../helpers/response')

const getReportOrders = async (req, res, next) => {
  try {
    const { sessionId, startDate, endDate, page, limit } = req.query

    const data = await reportService.getReportOrders({
      shopId: req.user.shopId,
      sessionId,
      startDate,
      endDate,
      page,
      limit,
    })

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Report orders fetched successfully',
      data,
    })
  } catch (error) {
    return next(error)
  }
}

const getClosedSalesSessions = async (req, res, next) => {
  try {
    const { page, limit } = req.query

    const data = await reportService.getClosedSalesSessions({
      shopId: req.user.shopId,
      page,
      limit,
    })

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Closed sales sessions fetched successfully',
      data,
    })
  } catch (error) {
    return next(error)
  }
}

const getSalesSummary = async (req, res, next) => {
  try {
    const { sessionId, startDate, endDate } = req.query

    const data = await reportService.getSalesSummary({
      shopId: req.user.shopId,
      sessionId,
      startDate,
      endDate,
    })

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Sales summary fetched successfully',
      data,
    })
  } catch (error) {
    return next(error)
  }
}

const getBusinessReport = async (req, res, next) => {
  try {
    const { sessionId, startDate, endDate } = req.query

    const data = await reportService.getBusinessReport({
      shopId: req.user.shopId,
      sessionId,
      startDate,
      endDate,
    })

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Business report fetched successfully',
      data,
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  getReportOrders,
  getClosedSalesSessions,
  getSalesSummary,
  getBusinessReport,
}