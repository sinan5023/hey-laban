const prisma = require("../lib/prisma");
const getBusinessDate = require("../helpers/getBusinessDate");
const ApiError = require("../helpers/ApiError");

const createOrder = async ({
  shopId,
  session,
  items,
  note,
  orderType = "DINE_IN",
  discountAmount = 0,
}) => {
  return await prisma.$transaction(async (tx) => {
    const { id: sessionId, date } = session;

    const counter = await tx.dailyCounter.upsert({
      where: {
        shopId_date: {
          shopId,
          date,
        },
      },
      update: {
        lastToken: { increment: 1 },
        lastOrder: { increment: 1 },
      },
      create: {
        shopId,
        date,
        lastToken: 1,
        lastOrder: 1,
        lastKot: 0,
      },
      select: {
        lastToken: true,
        lastOrder: true,
      },
    });

    const tokenNo = counter.lastToken;
    const nextOrderNum = counter.lastOrder;
    const orderNo = `ORD-${String(nextOrderNum)}`;

    const productIds = items.map((item) => item.productId);

    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missingIds = productIds.filter((id) => !foundIds.has(id));

      throw new ApiError(
        400,
        `Invalid or inactive product IDs: ${missingIds.join(", ")}`,
      );
    }

    let subtotal = 0;

    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const itemTotal = Number(product.price) * Number(item.quantity);

      subtotal += itemTotal;

      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        note: item.note || null,
      };
    });

    const totalAmount = Math.max(0, subtotal - Number(discountAmount));

    const order = await tx.order.create({
      data: {
        shopId,
        sessionId,
        orderNo,
        tokenNo,
        orderType,
        status: "OPEN",
        kotStatus: "NEW",
        subtotal,
        discountAmount,
        totalAmount,
        note: note || null,
        orderItems: {
          create: orderItems,
        },
      },
      include: {
        orderItems: true,
      },
    });

    return order;
  });
};

const listOrders = async ({
  shopId,
  session,
  status = null,
  kotStatus = null,
  page = 1,
  limit = 20,
  sortBy = "createdAt",
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

  if (kotStatus) {
    whereClause.kotStatus = kotStatus
  }

  const orderByClause = {}

  switch (sortBy) {
    case "tokenNo":
      orderByClause.tokenNo = sortDir.toLowerCase()
      break
    case "totalAmount":
      orderByClause.totalAmount = sortDir.toLowerCase()
      break
    default:
      orderByClause.createdAt = sortDir.toLowerCase()
      break
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    orderBy: orderByClause,
    skip: offset,
    take: limitNum,
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
      payments: {
        select: {
          method: true,
          amount: true,
          cashTendered: true,
          changeAmount: true,
          status: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },  
      },
      kot:{
        select:{
          id:true,
          kotNo:true,
          timesPrinted:true,
        }
      }
    },
  })

  const total = await prisma.order.count({ where: whereClause })

  return {
    data: orders,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      hasNext: pageNum * limitNum < total,
      hasPrev: pageNum > 1,
    },
  }
}

const getOrderById = async ({ shopId, sessionId, orderId }) => {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      shopId,
      sessionId,
    },
    include: {
      orderItems: {
        select: {
          id: true,
          productId: true,
          name: true,
          price: true,
          quantity: true,
          total: true,
          note: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              categoryId: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      kot: {
        where: {
          sessionId,
        },
        select: {
          id: true,
          kotNo: true,
          status: true,
          printedAt: true,
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
      },
      payments: {
        where: {
          sessionId,
        },
        select: {
          id: true,
          method: true,
          amount: true,
          referenceNo: true,
          cashTendered: true,
          changeAmount: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const totalPaid = order.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const balanceDue = Math.max(0, Number(order.totalAmount) - totalPaid);

  const enrichedOrderItems = order.orderItems.map((item) => {
    const category = item.product?.category;

    return {
      ...item,
      categoryId: category?.id || null,
      categoryName: category?.name || null,
    };
  });

  return {
    ...order,
    orderItems: enrichedOrderItems,
    totalPaid,
    balanceDue,
  };
};

const editOrderById = async ({ shopId, sessionId, orderId, items }) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        shopId,
        sessionId,
      },
      select: {
        id: true,
        shopId: true,
        sessionId: true,
        status: true,
        kotStatus: true,
        discountAmount: true,
      },
    });

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    if (order.status !== "OPEN") {
      throw new ApiError(400, "Cannot edit a non-OPEN order");
    }

    if (order.kotStatus !== "NEW") {
      throw new ApiError(400, "Cannot edit an order after KOT is printed");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "items array is required and must not be empty");
    }

    const productIds = items.map((item) => item.productId);

    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missingIds = productIds.filter((id) => !foundIds.has(id));
      throw new ApiError(
        400,
        `Invalid or inactive product IDs: ${missingIds.join(", ")}`,
      );
    }

    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const total = Number(product.price) * Number(item.quantity);

      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total,
        note: item.note || null,
      };
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0);
    const discountAmount = Number(order.discountAmount || 0);
    const totalAmount = Math.max(0, subtotal - discountAmount);

    if (!Number.isFinite(totalAmount)) {
      throw new ApiError(500, "Unable to compute valid totalAmount");
    }

    await tx.orderItem.deleteMany({
      where: {
        orderId: order.id,
      },
    });

    await tx.orderItem.createMany({
      data: orderItems.map((item) => ({
        ...item,
        orderId: order.id,
      })),
    });

    return await tx.order.update({
      where: { id: order.id },
      data: {
        subtotal,
        totalAmount,
      },
      include: {
        orderItems: {
          select: {
            id: true,
            productId: true,
            name: true,
            price: true,
            quantity: true,
            total: true,
            note: true,
            createdAt: true,
          },
        },
      },
    });
  });
};

const cancelOrderById = async ({ orderId, reason, shopId, sessionId, cancelledBy }) => {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      shopId,
      sessionId,
    },
    select: {
      id: true,
      orderNo: true,
      status: true,
      sessionId: true,
      kotStatus: true,
    },
  })

  if (!order) {
    throw new ApiError(404, 'Order not found for the current session')
  }

  if (order.status === 'CANCELLED') {
    throw new ApiError(400, 'Order is already cancelled')
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: 'CANCELLED',
        kotStatus: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      select: {
        id: true,
        orderNo: true,
        status: true,
        kotStatus: true,
        sessionId: true,
        cancelReason: true,
        cancelledAt: true,
        updatedAt: true,
      },
    })

    await tx.kot.updateMany({
      where: {
        orderId,
        shopId,
        sessionId,
        status: {
          not: 'CANCELLED',
        },
      },
      data: {
        status: 'CANCELLED',
      },
    })

    const cancelledKot = await tx.kot.findFirst({
      where: {
        orderId,
        shopId,
        sessionId,
      },
      select: {
        id: true,
        kotNo: true,
        status: true,
        printedAt: true,
      },
    })

    return {
      order: updatedOrder,
      kot: cancelledKot,
    }
  })

  return result
}



module.exports = {
  createOrder,
  listOrders,
  getOrderById,
  editOrderById,
  cancelOrderById
};
