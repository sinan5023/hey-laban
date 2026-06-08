const ApiError = require("../helpers/ApiError");
const { sendSuccess, sendError } = require("../helpers/response");
const orderService = require("../services/orders.service");

const createOrder = async (req, res, next) => {
  try {
    const shopId = req.user.shopId;
    const { note, discountAmount = 0, items, orderType } = req.body;

    const order = await orderService.createOrder({
      shopId,
      session: req.salesSession,
      items,
      note,
      orderType,
      discountAmount,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("createOrder error:", error);
    next(error);
  }
};

const listOrders = async (req, res, next) => {
  try {
    const shopId = req.user.shopId;
    const session = req.salesSession; // from requireOpenSalesSession
    const { query } = req;

    //fallback values for the apis
    const page = Math.max(1, parseInt(query.page, 10)) || 1;
    const limit = Math.max(1, parseInt(query.limit, 10)) || 20;
    const status = query.status || null;
    const kotStatus = query.kotStatus || null;
    const sortBy = query.sortBy || "createdAt";
    const sortDir = (query.sortDir || "DESC").toUpperCase();

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
      message: "Orders fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("listOrders error:", error);
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const shopId = req.user.shopId;
    const orderId = req.params.orderId;

    const order = await orderService.getOrderById({ shopId, orderId });

    return sendSuccess(res, {
      message: "Order fetched successfully",
      data: order,
    });
  } catch (error) {
    console.error("getOrderById error:", error);
    next(error);
  }
};

const editOrderById = async (req, res, next) => {
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
      message: "Order items updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("patchOrder error:", error);
    next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params
    const { reason } = req.body

    const payload = {
      orderId,
      reason,
      shopId: req.user.shopId,
      sessionId: req.salesSession.id, // change to req.salesSession.id if that is your actual key
      cancelledBy: req.user.id,
    }

    const data = await orderService.cancelOrderById(payload)

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Order cancelled successfully',
      data,
    })
  } catch (error) {
    next(error)
  }
}

const createOrderWithKot = async (req, res, next) => {
  try {
    const shopId = req.user.shopId;
    const { note, discountAmount = 0, items, orderType, kotNote } = req.body;

    const result = await orderService.createOrderWithKot({
      shopId,
      session: req.salesSession,
      items,
      note,
      orderType,
      discountAmount,
      kotNote: kotNote || null,
      createdById: req.user.id,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Order and KOT created successfully",
      data: result,
    });
  } catch (error) {
    console.error("createOrderWithKot error:", error);
    next(error);
  }
};

module.exports = {
  createOrder,
  listOrders,
  getOrderById,
  editOrderById,
  cancelOrder,
  createOrderWithKot,
};
