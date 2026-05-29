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
    const orderNo = `ORD-${String(nextOrderNum).padStart(4, "0")}`;

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
        `Invalid or inactive product IDs: ${missingIds.join(", ")}`
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
  // Ensure page and limit are integers and ≥ 1
  const pageNum = Math.max(1, parseInt(page, 10)) || 1;
  const limitNum = Math.max(1, parseInt(limit, 10)) || 20;
  const offset = (pageNum - 1) * limitNum;

  // Build WHERE clause
  const whereClause = {
    shopId,
    sessionId: session.id, // only today's session
  };

  if (status) {
    whereClause.status = status;
  }

  if (kotStatus) {
    whereClause.kotStatus = kotStatus;
  }

  // Build ORDER BY clause (Prisma likes lowercase asc/desc)
  const orderByClause = {};

  switch (sortBy) {
    case "tokenNo":
      orderByClause.tokenNo = sortDir.toLowerCase();
      break;
    case "totalAmount":
      orderByClause.totalAmount = sortDir.toLowerCase();
      break;
    default:
      orderByClause.createdAt = sortDir.toLowerCase();
      break;
  }

  // Fetch paginated order list (no items / payments for performance)
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
    },
  });

  // Count total for pagination
  const total = await prisma.order.count({ where: whereClause });

  return {
    data: orders,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      hasNext: pageNum * limitNum < total,
      hasPrev: pageNum > 1,
    },
  };
};

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
      kots: {
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

module.exports = {
  createOrder,
  listOrders,
  getOrderById,
  editOrderById,
};
