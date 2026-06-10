const { sendSuccess, sendError } = require('../helpers/response')
const salesSessionService = require('../services/salesSession.service')

const createSalesSession = async (req, res , next) => {
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

    const session = await salesSessionService.openSalesSession({
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
   next(error)
  }
}

const getTodaySession = async (req, res , next) => {
  try {
    const shopId = req.user?.shopId

    if (!shopId) {
      return sendError(res, {
        statusCode: 400,
        message: 'Shop id is required',
      })
    }

    const session = await salesSessionService.getTodaySalesSession({ shopId })

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Today sales session fetched successfully',
      data: session,
    })
  } catch (error) {
    next(error)
  }
}

const closeTodaySession = async (req, res , next) => {
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

    const session = await salesSessionService.closeTodaySalesSession({
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
    next(error)
  }
}

const getSalesSessionOverview = async (req, res, next) => {
  try {
    const shopId = req.user?.shopId;
    const preset = (req.query?.preset || '').toLowerCase();

    if (!shopId) {
      return sendError(res, {
        statusCode: 401,
        message: 'Shop context not found in authenticated user',
        error: null,
      });
    }

    if (!['previous', 'current'].includes(preset)) {
      return sendError(res, {
        statusCode: 400,
        message: 'Invalid preset. Allowed values are "previous" or "current".',
        error: null,
      });
    }

    const data =
      preset === 'previous'
        ? await salesSessionService.getPreviousSessionOverview({ shopId })
        : await salesSessionService.getCurrentSessionOverview({ shopId });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Sales session overview fetched successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  createSalesSession,
  closeTodaySession,
  getTodaySession,
  getSalesSessionOverview
}