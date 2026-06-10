const prisma = require('../lib/prisma')
const ApiError = require('../helpers/ApiError')

const toNumber = value => Number(value || 0)

const roundToTwo = value => Number(toNumber(value).toFixed(2))

const resolveTargetSessionIds = async (shopId, sessionId, startDate, endDate) => {
  if (sessionId) {
    const session = await prisma.salesSession.findFirst({
      where: {
        id: sessionId,
        shopId,
        status: 'CLOSED',
      },
    })

    if (!session) {
      throw new ApiError(404, 'Closed sales session not found')
    }

    return { sessionIds: [sessionId], openingCash: toNumber(session.openingCash) }
  }

  const from = new Date(startDate)
  const to = new Date(endDate)

  from.setHours(0, 0, 0, 0)
  to.setHours(0, 0, 0, 0)
  to.setDate(to.getDate() + 1)

  const sessions = await prisma.salesSession.findMany({
    where: {
      shopId,
      status: 'CLOSED',
      openedAt: {
        gte: from,
        lt: to,
      },
    },
  })

  const sessionIds = sessions.map(s => s.id)
  const openingCash = sessions.reduce((sum, s) => sum + toNumber(s.openingCash), 0)

  return { sessionIds, openingCash }
}

const getClosedSalesSessions = async ({ shopId, page = 1, limit = 20 }) => {
  const parsedPage = Number(page) || 1
  const parsedLimit = Number(limit) || 20

  if (parsedPage < 1) {
    throw new ApiError(400, 'page must be greater than or equal to 1')
  }

  if (parsedLimit < 1 || parsedLimit > 100) {
    throw new ApiError(400, 'limit must be between 1 and 100')
  }

  const skip = (parsedPage - 1) * parsedLimit

  const where = {
    shopId,
    status: 'CLOSED',
  }

  const [totalCount, sessions] = await Promise.all([
    prisma.salesSession.count({ where }),
    prisma.salesSession.findMany({
      where,
      skip,
      take: parsedLimit,
      select: {
        id: true,
        openedAt: true,
        closedAt: true,
        status: true,
        date: true,
      },
      orderBy: {
        openedAt: 'desc',
      },
    }),
  ])

  const totalPages = Math.ceil(totalCount / parsedLimit)

  return {
    sessions,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalCount,
      totalPages,
      hasNextPage: parsedPage < totalPages,
      hasPrevPage: parsedPage > 1,
    },
  }
}

const getReportOrders = async ({
  shopId,
  sessionId,
  startDate,
  endDate,
  page = 1,
  limit = 20,
}) => {
  const parsedPage = Number(page) || 1
  const parsedLimit = Number(limit) || 20

  if (parsedPage < 1) {
    throw new ApiError(400, 'page must be greater than or equal to 1')
  }

  if (parsedLimit < 1 || parsedLimit > 100) {
    throw new ApiError(400, 'limit must be between 1 and 100')
  }

  const skip = (parsedPage - 1) * parsedLimit

  const { sessionIds } = await resolveTargetSessionIds(shopId, sessionId, startDate, endDate)

  if (sessionIds.length === 0) {
    return {
      orders: [],
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    }
  }

  const where = {
    shopId,
    sessionId: { in: sessionIds },
  }

  const [totalCount, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: parsedLimit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        tokenNo: true,
        createdAt: true,
        status: true,
        orderItems: {
          select: {
            id: true,
            name: true,
            quantity: true,
          },
        },
        payments: {
          where: {
            status: 'COMPLETED',
          },
          select: {
            method: true,
            amount: true,
          },
        },
      },
    }),
  ])

  const data = orders.map(order => {
    const totalPaid = order.payments.reduce((sum, payment) => {
      return sum + toNumber(payment.amount)
    }, 0)

    let paymentMethod = 'NOTPAID'

    if (order.payments.length === 1) {
      paymentMethod = order.payments[0].method
    } else if (order.payments.length > 1) {
      paymentMethod = 'SPLIT'
    }

    const items = order.orderItems.map(item => ({
      name: item.name,
      quantity: toNumber(item.quantity),
    }))

    return {
      id: order.id,
      tokenNo: order.tokenNo,
      orderTime: order.createdAt,
      status: order.status,
      paymentMethod,
      totalPaid: roundToTwo(totalPaid),
      items,
    }
  })

  const totalPages = Math.ceil(totalCount / parsedLimit)

  return {
    orders: data,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalCount,
      totalPages,
      hasNextPage: parsedPage < totalPages,
      hasPrevPage: parsedPage > 1,
    },
  }
}

const getSalesSummary = async ({ shopId, sessionId, startDate, endDate }) => {
  const { sessionIds } = await resolveTargetSessionIds(shopId, sessionId, startDate, endDate)

  let orders = []

  if (sessionIds.length > 0) {
    orders = await prisma.order.findMany({
      where: { shopId, sessionId: { in: sessionIds } },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        orderItems: {
          select: {
            name: true,
            quantity: true,
          },
        },
        payments: {
          where: { status: 'COMPLETED' },
          select: { method: true, amount: true },
        },
      },
    })
  }

  const totalOrderCount = orders.length
  const completedOrdersCount = orders.filter((o) => o.status === 'COMPLETED').length
  const cancelledOrderCount = orders.filter((o) => o.status === 'CANCELLED').length

  const nonCancelledOrders = orders.filter((o) => o.status !== 'CANCELLED')

  const totalRevenueAmount = nonCancelledOrders.reduce(
    (sum, o) => sum + toNumber(o.totalAmount),
    0
  )

  const avgOrderValue =
    nonCancelledOrders.length > 0 ? totalRevenueAmount / nonCancelledOrders.length : 0

  const paymentBreakdown = { cash: 0, upi: 0, card: 0 }
  let totalCollectedPayments = 0
  let liabilityAmount = 0
  let dueOrderCount = 0

  const hourlyOrderCountMap = {}
  const itemSalesMap = {}

  nonCancelledOrders.forEach((order) => {
    const orderTotal = toNumber(order.totalAmount)

    if (order.orderItems) {
      order.orderItems.forEach((item) => {
        const qty = toNumber(item.quantity)
        if (!itemSalesMap[item.name]) {
          itemSalesMap[item.name] = 0
        }
        itemSalesMap[item.name] += qty
      })
    }

    const paidAmount = order.payments.reduce((sum, payment) => {
      const amount = toNumber(payment.amount)

      totalCollectedPayments += amount

      if (payment.method === 'CASH') {
        paymentBreakdown.cash += amount
      } else if (payment.method === 'UPI') {
        paymentBreakdown.upi += amount
      } else if (payment.method === 'CARD') {
        paymentBreakdown.card += amount
      }

      return sum + amount
    }, 0)

    const outstandingAmount = Math.max(orderTotal - paidAmount, 0)

    if (outstandingAmount > 0) {
      dueOrderCount += 1
      liabilityAmount += outstandingAmount
    }

    const hour = new Date(order.createdAt).getHours()
    hourlyOrderCountMap[hour] = (hourlyOrderCountMap[hour] || 0) + 1
  })

  const peakHours = Object.entries(hourlyOrderCountMap)
    .map(([hour, orderCount]) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      orderCount,
    }))
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 3)

  const topSellingProducts = Object.entries(itemSalesMap)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 4)

  return {
    orders: {
      totalOrderCount,
      completedOrdersCount,
      cancelledOrderCount,
      dueOrderCount,
      totalRevenueAmount: roundToTwo(totalRevenueAmount),
      avgOrderValue: roundToTwo(avgOrderValue),
      peakHours,
      topSellingProducts,
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
  }
}

const getBusinessReport = async ({ shopId, sessionId, startDate, endDate }) => {
  const { sessionIds, openingCash } = await resolveTargetSessionIds(shopId, sessionId, startDate, endDate)

  let orders = []
  let expenses = []

  if (sessionIds.length > 0) {
    const [fetchedOrders, fetchedExpenses] = await Promise.all([
      prisma.order.findMany({
        where: { shopId, sessionId: { in: sessionIds } },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          orderItems: {
            select: {
              name: true,
              quantity: true,
            },
          },
          payments: {
            where: { status: 'COMPLETED' },
            select: { method: true, amount: true },
          },
        },
      }),
      prisma.expense.findMany({
        where: { shopId, sessionId: { in: sessionIds } },
        select: {
          id: true,
          categoryName: true,
          amount: true,
          note: true,
          expenseDate: true,
          entryType: true,
        },
      }),
    ])
    orders = fetchedOrders
    expenses = fetchedExpenses
  }

  const totalOrderCount = orders.length
  const completedOrdersCount = orders.filter((o) => o.status === 'COMPLETED').length
  const cancelledOrderCount = orders.filter((o) => o.status === 'CANCELLED').length

  const nonCancelledOrders = orders.filter((o) => o.status !== 'CANCELLED')

  const totalRevenueAmount = nonCancelledOrders.reduce(
    (sum, o) => sum + toNumber(o.totalAmount),
    0
  )

  const avgOrderValue =
    nonCancelledOrders.length > 0 ? totalRevenueAmount / nonCancelledOrders.length : 0

  const paymentBreakdown = { cash: 0, upi: 0, card: 0 }
  let totalCollectedPayments = 0
  let liabilityAmount = 0
  let dueOrderCount = 0

  const hourlyOrderCountMap = {}
  const itemSalesMap = {}

  nonCancelledOrders.forEach((order) => {
    const orderTotal = toNumber(order.totalAmount)

    if (order.orderItems) {
      order.orderItems.forEach((item) => {
        const qty = toNumber(item.quantity)
        if (!itemSalesMap[item.name]) {
          itemSalesMap[item.name] = 0
        }
        itemSalesMap[item.name] += qty
      })
    }

    const paidAmount = order.payments.reduce((sum, payment) => {
      const amount = toNumber(payment.amount)

      totalCollectedPayments += amount

      if (payment.method === 'CASH') {
        paymentBreakdown.cash += amount
      } else if (payment.method === 'UPI') {
        paymentBreakdown.upi += amount
      } else if (payment.method === 'CARD') {
        paymentBreakdown.card += amount
      }

      return sum + amount
    }, 0)

    const outstandingAmount = Math.max(orderTotal - paidAmount, 0)

    if (outstandingAmount > 0) {
      dueOrderCount += 1
      liabilityAmount += outstandingAmount
    }

    const hour = new Date(order.createdAt).getHours()
    hourlyOrderCountMap[hour] = (hourlyOrderCountMap[hour] || 0) + 1
  })

  const peakHours = Object.entries(hourlyOrderCountMap)
    .map(([hour, orderCount]) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      orderCount,
    }))
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 3)

  const topSellingProducts = Object.entries(itemSalesMap)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 4)

  const cashExpensesAmount = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0)
  const expectedCashInDrawer = openingCash + paymentBreakdown.cash

  // Process expenses for P&L
  let cogs = 0
  let salaryWages = 0
  let rent = 0
  let utilities = 0
  let packaging = 0
  let miscellaneous = 0
  let otherExpenses = 0

  expenses.forEach((expense) => {
    const amount = toNumber(expense.amount)
    const category = (expense.categoryName || '').toLowerCase()

    if (category.includes('cogs') || category.includes('cost of goods sold')) {
      cogs += amount
    } else if (category.includes('salary') || category.includes('wage')) {
      salaryWages += amount
    } else if (category.includes('rent')) {
      rent += amount
    } else if (category.includes('utilit')) {
      utilities += amount
    } else if (category.includes('packag')) {
      packaging += amount
    } else if (category.includes('miscellanous') || category.includes('miscellaneous')) {
      miscellaneous += amount
    } else {
      otherExpenses += amount
    }
  })

  const grossProfit = totalRevenueAmount - cogs
  const totalExpensesAmount = salaryWages + rent + utilities + packaging + miscellaneous + otherExpenses
  const netProfit = grossProfit - totalExpensesAmount

  return {
    orders: {
      totalOrderCount,
      completedOrdersCount,
      cancelledOrderCount,
      dueOrderCount,
      totalRevenueAmount: roundToTwo(totalRevenueAmount),
      avgOrderValue: roundToTwo(avgOrderValue),
      peakHours,
      topSellingProducts,
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
      cashExpenses: roundToTwo(cashExpensesAmount),
      expectedCashInDrawer: roundToTwo(expectedCashInDrawer),
    },
    expenses,
    profitAndLoss: {
      totalRevenue: roundToTwo(totalRevenueAmount),
      cogs: roundToTwo(cogs),
      grossProfit: roundToTwo(grossProfit),
      operatingExpenses: {
        salaryWages: roundToTwo(salaryWages),
        rent: roundToTwo(rent),
        utilities: roundToTwo(utilities),
        packaging: roundToTwo(packaging),
        miscellaneous: roundToTwo(miscellaneous),
        otherExpenses: roundToTwo(otherExpenses),
        totalExpenses: roundToTwo(totalExpensesAmount),
      },
      netProfit: roundToTwo(netProfit),
    },
  }
}

module.exports = {
  getClosedSalesSessions,
  getReportOrders,
  getSalesSummary,
  getBusinessReport,
}