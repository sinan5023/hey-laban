// middlewares/requireOpenSalesSession.js
const prisma = require('../lib/prisma')
const { sendError } = require('../helpers/response')
const getBusinessDayStart  = require('../helpers/getbusinessDate')

const requireOpenSalesSession = async (req, res, next) => {
  try {
    const shopId = req.user?.shopId

    if (!shopId) {
      return sendError(res, {
        statusCode: 401,
        message: 'Shop context not found in authenticated user',
        error: null,
      })
    }

    const today = getBusinessDayStart()

    const session = await prisma.salesSession.findUnique({
      where: {
        shopId_date: {
          shopId,
          date: today,
        },
      },
      select: {
        id: true,
        shopId: true,
        date: true,
        status: true,
        openedAt: true,
        closedAt: true,
      },
    })

    if (!session) {
      return sendError(res, {
        statusCode: 409,
        message: 'Today’s sales session is not opened. Open session before performing transactions.',
        error: null,
      })
    }

    if (session.status !== 'OPEN') {
      return sendError(res, {
        statusCode: 409,
        message: 'Today’s sales session is already closed. Transactions are not allowed.',
        error: null,
      })
    }

    req.salesSession = session
    next()
  } catch (error) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to validate sales session',
      error: error.message || error,
    })
  }
}

module.exports = requireOpenSalesSession