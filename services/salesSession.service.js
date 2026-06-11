const {
  Prisma,
  SessionStatus,
  ExpenseEntryType,
  PaymentStatus,
  OrderStatus,
  PaymentMethod,
} = require("@prisma/client");
const prisma = require("../lib/prisma");
const ApiError = require("../helpers/ApiError");
const getBusinessDate = require("../helpers/getBusinessDate");
const getCloseBusinessDate = require("../helpers/businessDateForClose");

const toDecimal = (value, fieldName = "amount") => {
  if (value === undefined || value === null || value === "") {
    return new Prisma.Decimal(0);
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed) || parsed < 0) {
    throw new ApiError(400, `${fieldName} must be a valid non-negative number`);
  }

  return new Prisma.Decimal(parsed);
};

const normalizeCategoryName = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const getTodaySalesSession = async ({ shopId }) => {
  const businessDate = getBusinessDate();

  const session = await prisma.salesSession.findUnique({
    where: {
      shopId_date: {
        shopId,
        date: businessDate,
      },
    },
    include: {
      openedBy: {
        select: {
          id: true,
          name: true,
        },
      },
      closedBy: {
        select: {
          id: true,
          name: true,
        },
      },
      expenses: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
  if (!session) {
    throw new ApiError(409, "Sales session does not exist for today");
  }
  if (session && session.status === "CLOSED") {
    throw new ApiError(409, "The sales ession for today is closed");
  }
  return session;
};

const openSalesSession = async ({
  shopId,
  userId,
  openingCash,
  openingNote,
}) => {
  const businessDate = getBusinessDate();

  // Check if session already exists for today's business date
  const existingSession = await prisma.salesSession.findUnique({
    where: {
      shopId_date: {
        shopId,
        date: businessDate,
      },
    },
  });

  if (existingSession) {
    throw new ApiError(409, "Sales session already exists for today");
  }

  // Check if previous date session is still open
  const previousDate = new Date(businessDate);
  previousDate.setDate(previousDate.getDate() - 1);

  const previousSession = await prisma.salesSession.findUnique({
    where: {
      shopId_date: {
        shopId,
        date: previousDate,
      },
    },
  });

  if (previousSession && previousSession.status !== "CLOSED") {
    throw new ApiError(
      409,
      "Previous day's sales session is still open. Close it before opening a new session.",
    );
  }

  return prisma.salesSession.create({
    data: {
      shopId,
      date: businessDate,
      status: SessionStatus.OPEN,
      openingCash: toDecimal(openingCash, "openingCash"),
      openingNote: openingNote || null,
      openedById: userId,
    },
    include: {
      openedBy: {
        select: {
          id: true,
          name: true,
        },
      },
      expenses: true,
    },
  });
};
const BUSINESS_TIMEZONE = "Asia/Kolkata";
const BUSINESS_DAY_CUTOFF_HOUR = 2;

const isBeforeCutoffHour = (input = new Date()) => {
  const hourParts = new Intl.DateTimeFormat("en", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "numeric",
    hour12: false,
  }).formatToParts(input);

  const currentHour = parseInt(
    hourParts.find((p) => p.type === "hour").value,
    10,
  );

  return currentHour < BUSINESS_DAY_CUTOFF_HOUR;
};

const closeTodaySalesSession = async ({
  shopId,
  userId,
  closingNote,
  expenses = [],
}) => {
  const now = new Date();
  const normalizedExpenses = Array.isArray(expenses) ? expenses : [];

  // Validate expenses as before
  for (const expense of normalizedExpenses) {
    const categoryName = normalizeCategoryName(expense?.categoryName);

    if (!categoryName) {
      throw new ApiError(400, "Each expense must include a categoryName");
    }

    if (
      expense.amount === undefined ||
      expense.amount === null ||
      expense.amount === ""
    ) {
      throw new ApiError(
        400,
        `Amount is required for expense category: ${categoryName}`,
      );
    }

    toDecimal(expense.amount, `${categoryName} amount`);
  }

  return prisma.$transaction(async (tx) => {
    let session;

    if (isBeforeCutoffHour(now)) {
      // BEFORE 2 AM → use business close date helper (same behavior as before)
      const businessDate = getCloseBusinessDate(now);

      session = await tx.salesSession.findUnique({
        where: {
          shopId_date: {
            shopId,
            date: businessDate,
          },
        },
      });
    } else {
      // AFTER 2 AM → close the latest OPEN session for this shop
      session = await tx.salesSession.findFirst({
        where: {
          shopId,
          status: SessionStatus.OPEN,
        },
        orderBy: {
          openedAt: "desc",
        },
      });
    }

    if (!session) {
      throw new ApiError(404, "No sales session found for today");
    }

    if (session.status !== SessionStatus.OPEN) {
      throw new ApiError(409, "Today’s sales session is not open");
    }

    // TODO (enable later): block closing if there are unsettled orders
    // const unsettled = await tx.order.count({
    //   where: {
    //     shopId,
    //     sessionId: session.id,
    //     status: { in: ["OPEN", "DUE"] },
    //   },
    // });
    
    // if (unsettled > 0) {
    //   throw new ApiError(
    //     400,
    //     `${unsettled} orders are unsettled. Settle all orders before closing the session.`,
    //   );
    // }

    // Use business close date for expenseDate; this still respects your cutoff
    const businessDateForClose = getCloseBusinessDate(now);

    if (normalizedExpenses.length > 0) {
      await tx.expense.createMany({
        data: normalizedExpenses.map((expense) => ({
          shopId,
          sessionId: session.id,
          entryType: ExpenseEntryType.SESSION,
          categoryName: normalizeCategoryName(expense.categoryName),
          amount: toDecimal(
            expense.amount,
            `${normalizeCategoryName(expense.categoryName)} amount`,
          ),
          note: expense.note ? String(expense.note).trim() || null : null,
          expenseDate: businessDateForClose,
          periodStart: null,
          periodEnd: null,
          createdById: userId,
        })),
      });
    }

    await tx.salesSession.update({
      where: {
        id: session.id,
      },
      data: {
        status: SessionStatus.CLOSED,
        closingNote: closingNote || null,
        closedAt: now,
        closedById: userId,
      },
    });

    return tx.salesSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        openedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        closedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        expenses: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  });
};
const requireTodayOpenSession = async ({ shopId }) => {
  const businessDate = getBusinessDate();

  const session = await prisma.salesSession.findUnique({
    where: {
      shopId_date: {
        shopId,
        date: businessDate,
      },
    },
  });

  if (!session) {
    throw new ApiError(409, "Sales session is not opened for today");
  }

  if (session.status !== SessionStatus.OPEN) {
    throw new ApiError(409, "Sales session is closed for today");
  }

  return session;
};
const toNumber = (d) => (d ? Number(d) : 0);
const roundToTwo = (value) => Number(toNumber(value).toFixed(2));

const getPreviousSessionOverview = async ({ shopId }) => {
  const session = await prisma.salesSession.findFirst({
    where: { shopId, status: SessionStatus.CLOSED },
    orderBy: { date: "desc" },
    include: {
      openedBy: { select: { id: true, name: true } },
    },
  });

  if (!session) {
    throw new ApiError(404, "No previous closed session found for this shop");
  }

  const sessionId = session.id;

  const [orders, cashExpensesAgg] = await Promise.all([
    prisma.order.findMany({
      where: { shopId, sessionId },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        payments: {
          where: { status: PaymentStatus.COMPLETED },
          select: { method: true, amount: true },
        },
      },
    }),
    prisma.expense.aggregate({
      where: { shopId, sessionId, entryType: "SESSION" },
      _sum: { amount: true },
    }),
  ]);

  const totalOrderCount = orders.length;
  const completedOrdersCount = orders.filter(
    (o) => o.status === OrderStatus.COMPLETED,
  ).length;
  const cancelledOrderCount = orders.filter(
    (o) => o.status === OrderStatus.CANCELLED,
  ).length;

  const nonCancelledOrders = orders.filter(
    (o) => o.status !== OrderStatus.CANCELLED,
  );

  const totalRevenueAmount = nonCancelledOrders.reduce(
    (sum, o) => sum + toNumber(o.totalAmount),
    0,
  );

  const avgOrderValue =
    nonCancelledOrders.length > 0
      ? totalRevenueAmount / nonCancelledOrders.length
      : 0;

  const paymentBreakdown = { cash: 0, upi: 0, card: 0 };
  let totalCollectedPayments = 0;
  let liabilityAmount = 0;
  let dueOrderCount = 0;

  const hourlyOrderCountMap = {};

  nonCancelledOrders.forEach((order) => {
    const orderTotal = toNumber(order.totalAmount);

    const paidAmount = order.payments.reduce((sum, payment) => {
      const amount = toNumber(payment.amount);

      totalCollectedPayments += amount;

      if (payment.method === PaymentMethod.CASH) {
        paymentBreakdown.cash += amount;
      } else if (payment.method === PaymentMethod.UPI) {
        paymentBreakdown.upi += amount;
      } else if (payment.method === PaymentMethod.CARD) {
        paymentBreakdown.card += amount;
      }

      return sum + amount;
    }, 0);

    const outstandingAmount = Math.max(orderTotal - paidAmount, 0);

    if (outstandingAmount > 0) {
      dueOrderCount += 1;
      liabilityAmount += outstandingAmount;
    }

    const hour = new Date(order.createdAt).getHours();
    hourlyOrderCountMap[hour] = (hourlyOrderCountMap[hour] || 0) + 1;
  });

  const peakHours = Object.entries(hourlyOrderCountMap)
    .map(([hour, orderCount]) => ({
      hour: `${String(hour).padStart(2, "0")}:00`,
      orderCount,
    }))
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 3);

  const cashExpenses = toNumber(cashExpensesAgg._sum.amount);
  const openingCash = toNumber(session.openingCash);
  const expectedCashInDrawer =
    openingCash + paymentBreakdown.cash - cashExpenses;

  return {
    preset: "previous",
    session: {
      sessionId: session.id,
      sessionDate: session.date,
      openedAt: session.openedAt,
      openedBy: session.openedBy
        ? { id: session.openedBy.id, name: session.openedBy.name }
        : null,
      openingCash: roundToTwo(openingCash),
    },
    orders: {
      totalOrderCount,
      completedOrdersCount,
      cancelledOrderCount,
      dueOrderCount,
      totalRevenueAmount: roundToTwo(totalRevenueAmount),
      avgOrderValue: roundToTwo(avgOrderValue),
      peakHours,
    },
    payments: {
      totalCollectedPayments: roundToTwo(totalCollectedPayments),
      paymentBreakdown: {
        cash: roundToTwo(paymentBreakdown.cash),
        upi: roundToTwo(paymentBreakdown.upi),
        card: roundToTwo(paymentBreakdown.card),
      },
      liability: {
        unpaidOrderCount: dueOrderCount,
        unpaidAmount: roundToTwo(liabilityAmount),
      },
    },
    cashDrawer: {
      openingCash: roundToTwo(openingCash),
      cashCollected: roundToTwo(paymentBreakdown.cash),
      cashExpenses: roundToTwo(cashExpenses),
      expectedCashInDrawer: roundToTwo(expectedCashInDrawer),
    },
  };
};

const getCurrentSessionOverview = async ({ shopId }) => {
  const now = new Date();

  let session;

  // Use the same cutoff rule as close service
  const businessDate = getCloseBusinessDate(now);

  // BEFORE 2 AM → businessDate is yesterday; that is the current session’s date
  // AFTER 2 AM → businessDate is today; but you said:
  //   "if the time is greater than 2am then we should get the latest openedAt && session is open"
  const hourParts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);

  const currentHour = parseInt(
    hourParts.find((p) => p.type === "hour").value,
    10,
  );

  if (currentHour < 2) {
    // before 2am → use business date to locate the current open session
    session = await prisma.salesSession.findFirst({
      where: {
        shopId,
        date: businessDate,
        status: SessionStatus.OPEN,
      },
      include: {
        openedBy: {
          select: { id: true, name: true },
        },
      },
    });
  } else {
    // after 2am → use "latest open session" by openedAt
    session = await prisma.salesSession.findFirst({
      where: {
        shopId,
        status: SessionStatus.OPEN,
      },
      orderBy: {
        openedAt: "desc",
      },
      include: {
        openedBy: {
          select: { id: true, name: true },
        },
      },
    });
  }

  if (!session) {
    throw new ApiError(404, "No open sales session found for current view");
  }

  const sessionId = session.id;

  // Reuse the exact same metric computation as report overview:
  const [orders, cashExpensesAgg] = await Promise.all([
    prisma.order.findMany({
      where: { shopId, sessionId },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        payments: {
          where: { status: PaymentStatus.COMPLETED },
          select: { method: true, amount: true },
        },
      },
    }),
    prisma.expense.aggregate({
      where: { shopId, sessionId, entryType: "SESSION" },
      _sum: { amount: true },
    }),
  ]);

  const totalOrderCount = orders.length;
  const completedOrdersCount = orders.filter(
    (o) => o.status === OrderStatus.COMPLETED,
  ).length;
  const cancelledOrderCount = orders.filter(
    (o) => o.status === OrderStatus.CANCELLED,
  ).length;

  const nonCancelledOrders = orders.filter(
    (o) => o.status !== OrderStatus.CANCELLED,
  );

  const totalRevenueAmount = nonCancelledOrders.reduce(
    (sum, o) => sum + toNumber(o.totalAmount),
    0,
  );

  const avgOrderValue =
    nonCancelledOrders.length > 0
      ? totalRevenueAmount / nonCancelledOrders.length
      : 0;

  const paymentBreakdown = { cash: 0, upi: 0, card: 0 };
  let totalCollectedPayments = 0;
  let liabilityAmount = 0;
  let dueOrderCount = 0;

  const hourlyOrderCountMap = {};

  nonCancelledOrders.forEach((order) => {
    const orderTotal = toNumber(order.totalAmount);

    const paidAmount = order.payments.reduce((sum, payment) => {
      const amount = toNumber(payment.amount);

      totalCollectedPayments += amount;

      if (payment.method === PaymentMethod.CASH) {
        paymentBreakdown.cash += amount;
      } else if (payment.method === PaymentMethod.UPI) {
        paymentBreakdown.upi += amount;
      } else if (payment.method === PaymentMethod.CARD) {
        paymentBreakdown.card += amount;
      }

      return sum + amount;
    }, 0);

    const outstandingAmount = Math.max(orderTotal - paidAmount, 0);

    if (outstandingAmount > 0) {
      dueOrderCount += 1;
      liabilityAmount += outstandingAmount;
    }

    const hour = new Date(order.createdAt).getHours();
    hourlyOrderCountMap[hour] = (hourlyOrderCountMap[hour] || 0) + 1;
  });

  const peakHours = Object.entries(hourlyOrderCountMap)
    .map(([hour, orderCount]) => ({
      hour: `${String(hour).padStart(2, "0")}:00`,
      orderCount,
    }))
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 3);

  const cashExpenses = toNumber(cashExpensesAgg._sum.amount);
  const openingCash = toNumber(session.openingCash);
  const expectedCashInDrawer =
    openingCash + paymentBreakdown.cash - cashExpenses;

  return {
    preset: "current",
    session: {
      sessionId: session.id,
      sessionDate: session.date,
      openedAt: session.openedAt,
      openedBy: session.openedBy
        ? { id: session.openedBy.id, name: session.openedBy.name }
        : null,
      openingCash: roundToTwo(openingCash),
    },
    orders: {
      totalOrderCount,
      completedOrdersCount,
      cancelledOrderCount,
      dueOrderCount,
      totalRevenueAmount: roundToTwo(totalRevenueAmount),
      avgOrderValue: roundToTwo(avgOrderValue),
      peakHours,
    },
    payments: {
      totalCollectedPayments: roundToTwo(totalCollectedPayments),
      paymentBreakdown: {
        cash: roundToTwo(paymentBreakdown.cash),
        upi: roundToTwo(paymentBreakdown.upi),
        card: roundToTwo(paymentBreakdown.card),
      },
      liability: {
        unpaidOrderCount: dueOrderCount,
        unpaidAmount: roundToTwo(liabilityAmount),
      },
    },
    cashDrawer: {
      openingCash: roundToTwo(openingCash),
      cashCollected: roundToTwo(paymentBreakdown.cash),
      cashExpenses: roundToTwo(cashExpenses),
      expectedCashInDrawer: roundToTwo(expectedCashInDrawer),
    },
  };
};

module.exports = {
  openSalesSession,
  getTodaySalesSession,
  closeTodaySalesSession,
  getPreviousSessionOverview,
  getCurrentSessionOverview,
};
