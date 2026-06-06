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

    const businessDate = getBusinessDate()

    // Look for today's (operational business date) session
    const session = await prisma.salesSession.findUnique({
      where: {
        shopId_date: {
          shopId,
          date: businessDate,
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

    // Today's session exists and is open — happy path
    if (session && session.status === 'OPEN') {
      req.salesSession = session
      return next()
    }

    // Today's session exists but is closed
    if (session && session.status !== 'OPEN') {
      return sendError(res, {
        statusCode: 409,
        message: "Today's sales session is already closed. Transactions are not allowed.",
        error: null,
      })
    }

    // No session for today's business date — check if previous date session is still open
    const previousDate = new Date(businessDate)
    previousDate.setDate(previousDate.getDate() - 1)

    const previousSession = await prisma.salesSession.findUnique({
      where: {
        shopId_date: {
          shopId,
          date: previousDate,
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

    if (previousSession && previousSession.status === 'OPEN') {
      return sendError(res, {
        statusCode: 409,
        message:
          "Previous day's sales session is still open. Close it before performing any transactions.",
        error: null,
      })
    }

    // No session at all for today
    return sendError(res, {
      statusCode: 409,
      message: "Today's sales session is not opened. Open a session before performing transactions.",
      error: null,
    })
  } catch (error) {
    return sendError(res, {
      statusCode: 500,
      message: 'Failed to validate sales session',
      error: error.message || error,
    })
  }
}

module.exports = requireOpenSalesSession