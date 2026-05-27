const prisma = require("../lib/prisma")
const ApiError = require("../helpers/ApiError")
const getBusinessDate = require("../helpers/getBusinessDate")

const createKot = async ({ shopId, orderId, note, createdById, salesSessionId }) => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        shopId,
      },
      include: {
        orderItems: {
          select: {
            productId: true,
            name: true,
            quantity: true,
            note: true,
          },
        },
        kot: {
          include: {
            kotItems: true,
          },
        },
      },
    })

    if (!order) {
      throw new ApiError(404, "Order not found")
    }

    if (salesSessionId && order.sessionId !== salesSessionId) {
      throw new ApiError(400, "Order does not belong to the active sales session")
    }

    if (order.status === "CANCELLED") {
      throw new ApiError(400, "Cannot create KOT for a cancelled order")
    }

    if (!order.orderItems.length) {
      throw new ApiError(400, "Cannot create KOT without order items")
    }

    const sessionId = order.sessionId

    if (order.kot) {
      const updatedKot = await tx.kot.update({
        where: {
          orderId: order.id,
        },
        data: {
          status: "REPRINTED",
          printedAt: new Date(),
          note: note ?? order.kot.note ?? null,
          createdById: createdById ?? order.kot.createdById ?? null,
          timesPrinted: {
            increment: 1,
          },
        },
        include: {
          kotItems: true,
        },
      })

      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          kotStatus: "REPRINTED",
        },
      })

      return {
        id: updatedKot.id,
        sessionId: updatedKot.sessionId,
        orderId: updatedKot.orderId,
        orderNo: order.orderNo,
        tokenNo: order.tokenNo,
        kotNo: updatedKot.kotNo,
        status: updatedKot.status,
        timesPrinted: updatedKot.timesPrinted,
        note: updatedKot.note,
        printedAt: updatedKot.printedAt,
        kotItems: updatedKot.kotItems.map((item) => ({
          id: item.id,
          kotId: item.kotId,
          productId: item.productId,
          name: item.name,
          quantity: Number(item.quantity),
          note: item.note,
        })),
      }
    }

    const businessDate = getBusinessDate()

    const counter = await tx.dailyCounter.upsert({
      where: {
        shopId_date: {
          shopId,
          date: businessDate,
        },
      },
      update: {
        lastKot: {
          increment: 1,
        },
      },
      create: {
        shopId,
        date: businessDate,
        lastToken: 0,
        lastOrder: 0,
        lastKot: 1,
      },
      select: {
        lastKot: true,
      },
    })

    const kotNo = `KOT-${String(counter.lastKot).padStart(4, "0")}`

    const kot = await tx.kot.create({
      data: {
        shopId,
        sessionId,
        orderId: order.id,
        kotNo,
        status: "PRINTED",
        timesPrinted: 1,
        note: note ?? null,
        createdById: createdById ?? null,
        kotItems: {
          create: order.orderItems.map((item) => ({
            productId: item.productId ?? null,
            name: item.name,
            quantity: item.quantity,
            note: item.note ?? null,
          })),
        },
      },
      include: {
        kotItems: true,
      },
    })

    await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        kotStatus: "PRINTED",
      },
    })

    return {
      id: kot.id,
      sessionId: kot.sessionId,
      orderId: kot.orderId,
      orderNo: order.orderNo,
      tokenNo: order.tokenNo,
      kotNo: kot.kotNo,
      status: kot.status,
      timesPrinted: kot.timesPrinted,
      note: kot.note,
      printedAt: kot.printedAt,
      kotItems: kot.kotItems.map((item) => ({
        id: item.id,
        kotId: item.kotId,
        productId: item.productId,
        name: item.name,
        quantity: Number(item.quantity),
        note: item.note,
      })),
    }
  })
}

module.exports = {
  createKot,
}