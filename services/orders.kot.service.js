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

    const kotNo = `KOT-${String(counter.lastKot)}`

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

const getKotById = async ({ shopId, session, kotId }) => {
  const kot = await prisma.kot.findFirst({
    where: {
      id: kotId,
      shopId,
      sessionId: session.id,
    },
    select: {
      id: true,
      shopId: true,
      sessionId: true,
      orderId: true,
      kotNo: true,
      status: true,
      timesPrinted: true,
      note: true,
      printedAt: true,
      createdById: true,
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
        },
      },
      kotItems: {
        select: {
          id: true,
          kotId: true,
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
    ...kot,
    kotItems: kot.kotItems.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
    })),
  }
}

const listKots = async ({
  shopId,
  session,
  status = null,
  page = 1,
  limit = 20,
  sortBy = "printedAt",
  sortDir = "DESC",
}) => {
  const pageNum = Math.max(1, parseInt(page, 10)) || 1
  const limitNum = Math.max(1, parseInt(limit, 10)) || 20
  const offset = (pageNum - 1) * limitNum

  const whereClause = {
    shopId,
    sessionId: session.id,
  }

  if (status) {
    whereClause.status = status
  }

  const orderByClause = {}

  switch (sortBy) {
    case "kotNo":
      orderByClause.kotNo = sortDir.toLowerCase()
      break
    case "timesPrinted":
      orderByClause.timesPrinted = sortDir.toLowerCase()
      break
    default:
      orderByClause.printedAt = sortDir.toLowerCase()
      break
  }

  const [kots, total] = await Promise.all([
    prisma.kot.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip: offset,
      take: limitNum,
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
          },
        },
      },
    }),
    prisma.kot.count({
      where: whereClause,
    })
  ])

  return {
    data: kots,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      hasNext: pageNum * limitNum < total,
      hasPrev: pageNum > 1,
    },
  }
}

module.exports = {
  createKot,
  listKots,
  getKotById
}