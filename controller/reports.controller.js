const reportService = require('../services/reports.service')
const { sendSuccess } = require('../helpers/response')

const getOverviewReport = async (req, res, next) => {
  try {
    const { preset, startDate, endDate } = req.query

    const data = await reportService.getOverviewReport({
      shopId: req.user.shopId,
      preset,
      startDate,
      endDate,
    })

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Overview report fetched successfully',
      data,
    })
  } catch (error) {
    return next(error)
  }
}
const getReportOrders = async (req, res, next) => {
  try {
    const { preset, startDate, endDate, page, limit } = req.query

    const data = await reportService.getReportOrders({
      shopId: req.user.shopId,
      preset,
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

module.exports = {
  getOverviewReport,
  getReportOrders
}