const searchService = require("../services/orders.kot.search.service")
const { sendSuccess } = require("../helpers/response")

const searchTicketsHandler = async (req, res, next) => {
  try {
    const data = await searchService.searchTickets({
      shopId: req.user.shopId,
      session: req.salesSession,
      q: req.query.q,
    })

    return sendSuccess(res, {
      statusCode: 200,
      message: "Search completed successfully",
      data,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  searchTicketsHandler,
}