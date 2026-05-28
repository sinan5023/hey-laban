const paymentsService = require("../services/orders.payments.service")
const {sendSuccess} = require("../helpers/response")

const addPaymentsToOrderHandler = async (req, res, next) => {
  try {
    const data = await paymentsService.addPaymentsToOrder({
      shopId: req.user.shopId,
      session: req.salesSession,
      orderId: req.params.orderId,
      payments: req.body.payments,
      createdById: req.user.id,
    })

   return sendSuccess(res, {
      statusCode: 200,
      message: "Payment Added Succesfully",
      data,
    })
  } catch (error) {
    next(error)
  }
}

const getPaymentsByOrderIdHandler = async (req, res, next) => {
  try {
    const data = await paymentsService.getPaymentsByOrderId({
      shopId: req.user.shopId,
      session: req.salesSession,
      orderId: req.params.orderId,
    })

    return sendSuccess(res, {
      statusCode: 200,
      message: "Order payments fetched successfully",
      data,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  addPaymentsToOrderHandler,
  getPaymentsByOrderIdHandler
}