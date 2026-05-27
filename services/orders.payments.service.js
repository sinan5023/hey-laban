const prisma = require("../lib/prisma")
const ApiError = require("../helpers/ApiError")

const addPaymentsToOrder = async ({
  shopId,
  session,
  orderId,
  payments,
  createdById = null,
}) => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        shopId,
        sessionId: session.id,
      },
      include: {
        payments: {
          where: {
            status: "COMPLETED",
          },
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
          },
        },
      },
    })

    if (!order) {
      throw new ApiError(404, "Order not found")
    }

    if (order.status === "CANCELLED") {
      throw new ApiError(400, "Cannot add payment to a cancelled order")
    }

    if (order.status === "COMPLETED") {
      throw new ApiError(400, "Order is already fully paid")
    }

    if (!Array.isArray(payments) || payments.length === 0) {
      throw new ApiError(400, "payments array is required and must not be empty")
    }

    const totalAmount = Number(order.totalAmount)

    const totalPaidBefore = order.payments.reduce((sum, payment) => {
      return sum + Number(payment.amount)
    }, 0)

    const balanceDueBefore = Math.max(0, totalAmount - totalPaidBefore)

    if (balanceDueBefore <= 0) {
      throw new ApiError(400, "Order has no pending balance")
    }

    let requestTotal = 0
    const normalizedPayments = []

    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i]
      const method = payment.method
      const amount = Number(payment.amount)
      const referenceNo = payment.referenceNo ?? null

      if (!method) {
        throw new ApiError(400, `Payment method is required at index ${i}`)
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new ApiError(400, `Valid payment amount is required at index ${i}`)
      }

      let cashTendered = null
      let changeAmount = null

      if (method === "CASH") {
        if (payment.cashTendered == null) {
          throw new ApiError(400, `cashTendered is required for CASH payment at index ${i}`)
        }

        cashTendered = Number(payment.cashTendered)

        if (!Number.isFinite(cashTendered) || cashTendered < amount) {
          throw new ApiError(
            400,
            `cashTendered must be greater than or equal to amount at index ${i}`
          )
        }

        changeAmount = cashTendered - amount
      } else if (payment.cashTendered != null) {
        throw new ApiError(
          400,
          `cashTendered is only allowed for CASH payment at index ${i}`
        )
      }

      requestTotal += amount

      normalizedPayments.push({
        method,
        amount,
        referenceNo,
        cashTendered,
        changeAmount,
      })
    }

    if (requestTotal > balanceDueBefore) {
      throw new ApiError(
        400,
        `Total payment amount cannot exceed balance due (${balanceDueBefore})`
      )
    }

    const createdPayments = []

    for (const payment of normalizedPayments) {
      const createdPayment = await tx.payment.create({
        data: {
          shopId,
          sessionId: session.id,
          orderId: order.id,
          method: payment.method,
          amount: payment.amount,
          referenceNo: payment.referenceNo,
          cashTendered: payment.cashTendered,
          changeAmount: payment.changeAmount,
          status: "COMPLETED",
          createdById: createdById ?? null,
        },
        select: {
          id: true,
          shopId: true,
          sessionId: true,
          orderId: true,
          method: true,
          amount: true,
          referenceNo: true,
          cashTendered: true,
          changeAmount: true,
          status: true,
          createdAt: true,
        },
      })

      createdPayments.push(createdPayment)
    }

    const totalPaidAfter = totalPaidBefore + requestTotal
    const balanceDueAfter = Math.max(0, totalAmount - totalPaidAfter)

    let nextOrderStatus = "DUE"
    let completedAt = null

    if (balanceDueAfter === 0) {
      nextOrderStatus = "COMPLETED"
      completedAt = new Date()
    }

    const updatedOrder = await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: nextOrderStatus,
        completedAt,
      },
      select: {
        id: true,
        orderNo: true,
        tokenNo: true,
        status: true,
        totalAmount: true,
      },
    })

    return {
      orderId: updatedOrder.id,
      orderNo: updatedOrder.orderNo,
      tokenNo: updatedOrder.tokenNo,
      orderStatus: updatedOrder.status,
      totalAmount: Number(updatedOrder.totalAmount),
      totalPaid: totalPaidAfter,
      balanceDue: balanceDueAfter,
      payments: createdPayments.map((payment) => ({
        id: payment.id,
        shopId: payment.shopId,
        sessionId: payment.sessionId,
        orderId: payment.orderId,
        method: payment.method,
        amount: Number(payment.amount),
        referenceNo: payment.referenceNo,
        cashTendered:
          payment.cashTendered != null ? Number(payment.cashTendered) : null,
        changeAmount:
          payment.changeAmount != null ? Number(payment.changeAmount) : null,
        status: payment.status,
        createdAt: payment.createdAt,
      })),
    }
  })
}

module.exports = {
  addPaymentsToOrder,
}