const prisma = require('../lib/prisma')
const { sendError } = require('../helpers/response')
const getBusinessDate = require('../helpers/getBusinessDate')

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

    // Find the currently open session for this shop (regardless of date)
    const session = await prisma.salesSession.findFirst({
      where: {
        shopId,
        status: 'OPEN',
      },
      orderBy: {
        openedAt: 'desc',
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
      // No open session at all
      return sendError(res, {
        statusCode: 409,
        message: "Today's sales session is not opened. Open a session before performing transactions.",
        error: null,
      })
    }

    const currentBusinessDate = getBusinessDate()

    const isClosingSession = req.originalUrl.includes('/sales-session') && req.method === 'PATCH'

    if (!isClosingSession && session.date.getTime() !== currentBusinessDate.getTime()) {
      return sendError(res, {
        statusCode: 409,
        message: 'The current open session belongs to a previous business day. Please close it and open a new session for today.',
        error: null,
      })
    }

    // Happy path: there is an open session
    req.salesSession = session
    return next()
  } catch (error) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to validate sales session',
      error: error.message || error,
    })
  }
}

module.exports = requireOpenSalesSession