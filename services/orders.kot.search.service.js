const prisma = require("../lib/prisma")
const ApiError = require("../helpers/ApiError")


const searchTickets = async ({ shopId, session, q }) => {
  const query = q.trim().toUpperCase()


  if (query.startsWith("ORD-")) {
    const order = await prisma.order.findFirst({
      where: {
        shopId,
        sessionId: session.id,
        orderNo: query,
      },
      select: {
        id: true,
        orderNo: true,
        tokenNo: true,
        status: true,
        kotStatus: true,
        subtotal: true,
        discountAmount: true,
        totalAmount: true,
        note: true,
        createdAt: true,
        completedAt: true,
        cancelledAt: true,
        kot: {
          select: {
            id: true,
            kotNo: true,
            status: true,
            timesPrinted: true,
            printedAt: true,
          },
        },
        payments: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            method: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    })


    if (!order) {
      throw new ApiError(404, "Order not found")
    }


    const totalPaid = order.payments
      .filter((payment) => payment.status === "COMPLETED")
      .reduce((sum, payment) => sum + Number(payment.amount), 0)


    return {
      type: "ORDER",
      data: {
        ...order,
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        totalAmount: Number(order.totalAmount),
        totalPaid,
        balanceDue: Math.max(0, Number(order.totalAmount) - totalPaid),
        payments: order.payments.map((payment) => ({
          ...payment,
          amount: Number(payment.amount),
        })),
      },
    }
  }


  if (query.startsWith("KOT-")) {
    const kot = await prisma.kot.findFirst({
      where: {
        shopId,
        sessionId: session.id,
        kotNo: query,
      },
      select: {
        id: true,
        kotNo: true,
        status: true,
        timesPrinted: true,
        note: true,
        printedAt: true,
        order: {
          select: {
            id: true,
            orderNo: true,
            tokenNo: true,
            status: true,
            kotStatus: true,
            subtotal: true,
            discountAmount: true,
            totalAmount: true,
            note: true,
            createdAt: true,
            completedAt: true,
          },
        },
        kotItems: {
          select: {
            id: true,
            productId: true,
            name: true,
            quantity: true,
            note: true,
          },
        },
      },
    })


    if (!kot) {
      throw new ApiError(404, "KOT not found")
    }


    return {
      type: "KOT",
      data: {
        ...kot,
        kotItems: kot.kotItems.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
        })),
        order: kot.order
          ? {
              ...kot.order,
              subtotal: Number(kot.order.subtotal),
              discountAmount: Number(kot.order.discountAmount),
              totalAmount: Number(kot.order.totalAmount),
            }
          : null,
      },
    }
  }


  throw new ApiError(400, "Invalid search query. Use ORD-xxxx or KOT-xxxx")
}


module.exports = {
  searchTickets,
}