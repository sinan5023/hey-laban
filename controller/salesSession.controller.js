const { sendSuccess, sendError } = require('../helpers/response')
const {
  openSalesSession,
  getTodaySalesSession,
  closeTodaySalesSession,
} = require('../services/salesSession.service')

const createSalesSession = async (req, res) => {
  try {
    const shopId = req.user?.shopId
    const userId = req.user?.id
    const { openingCash, openingNote } = req.body

    if (!shopId) {
      return sendError(res, {
        statusCode: 400,
        message: 'Shop id is required',
      })
    }

    if (!userId) {
      return sendError(res, {
        statusCode: 401,
        message: 'User not authenticated',
      })
    }

    const session = await openSalesSession({
      shopId,
      userId,
      openingCash,
      openingNote,
    })

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Sales session opened successfully',
      data: session,
    })
  } catch (error) {
   console.log(error)
   next(error)
  }
}

const getTodaySession = async (req, res) => {
  try {
    const shopId = req.user?.shopId

    if (!shopId) {
      return sendError(res, {
        statusCode: 400,
        message: 'Shop id is required',
      })
    }

    const session = await getTodaySalesSession({ shopId })

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Today sales session fetched successfully',
      data: session,
    })
  } catch (error) {
    console.log(error)
    next(error)
  }
}

const closeTodaySession = async (req, res) => {
  try {
    const shopId = req.user?.shopId
    const userId = req.user?.id
    const { closingNote, expenses } = req.body

    if (!shopId) {
      return sendError(res, {
        statusCode: 400,
        message: 'Shop id is required',
      })
    }

    if (!userId) {
      return sendError(res, {
        statusCode: 401,
        message: 'User not authenticated',
      })
    }

    const session = await closeTodaySalesSession({
      shopId,
      userId,
      closingNote,
      expenses,
    })

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Sales session closed successfully',
      data: session,
    })
  } catch (error) {
    console.log(error)
    next(error)
  }
}

module.exports = {
  createSalesSession,
  getTodaySession,
  closeTodaySession,
}