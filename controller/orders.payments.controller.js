const paymentsService = require("../services/orders.payments.service")

const addPaymentsToOrderHandler = async (req, res, next) => {
  try {
    const data = await paymentsService.addPaymentsToOrder({
      shopId: req.user.shopId,
      session: req.salesSession,
      orderId: req.params.orderId,
      payments: req.body.payments,
      createdById: req.user.id,
    })

    res.status(201).json({
      success: true,
      message: "Payments added successfully",
      data,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  addPaymentsToOrderHandler,
}