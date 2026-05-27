const ApiError = require("../helpers/ApiError");
const { sendSuccess, sendError } = require("../helpers/response");
const orderService = require("../services/orders.service");

const createOrder = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { note, discountAmount = 0, items } = req.body;

    const order = await orderService.createOrder({
      shopId,
      session: req.salesSession, // from requireOpenSalesSession middleware
      items,
      note,
      discountAmount,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("createOrder error:", error);
    next(error)
  }
};


const listOrders = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const session = req.salesSession; // from requireOpenSalesSession
    const { query } = req;

    //fallback values for the apis 
     const page = Math.max(1, parseInt(query.page, 10)) || 1;
    const limit = Math.max(1, parseInt(query.limit, 10)) || 20;
    const status = query.status || null;
    const kotStatus = query.kotStatus || null;
    const sortBy = query.sortBy || 'createdAt';
    const sortDir = (query.sortDir || 'DESC').toUpperCase();

    const result = await orderService.listOrders({
      shopId,
      session,
      status,
      kotStatus,
      page,
      limit,
      sortBy,
      sortDir,
    });

    return sendSuccess(res, {
      message: 'Orders fetched successfully',
      data: result,
    });
  } catch (error) {
    console.error('listOrders error:', error);
    next(error)
  }
};

const getOrderById = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const orderId = req.params.orderId;

    const order = await orderService.getOrderById({ shopId, orderId });

    return sendSuccess(res, {
      message: 'Order fetched successfully',
      data: order,
    });
  } catch (error) {
    console.error('getOrderById error:', error);
    next(error)
  }
};

const editOrderById = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const orderId = req.params.orderId;
    const { items } = req.body; // already validated by Joi

    const order = await orderService.editOrderById({
      shopId,
      orderId,
      items,
    });

    return sendSuccess(res, {
      message: 'Order items updated successfully',
      data: order,
    });
  } catch (error) {
    console.error('patchOrder error:', error);
    next(error)
  }
};

module.exports = { createOrder , listOrders  , getOrderById , editOrderById };
