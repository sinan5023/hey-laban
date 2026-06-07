const prisma = require('../lib/prisma')
const ApiError = require('../helpers/ApiError')

const ALLOWED_PRESETS = ['today', 'yesterday']

const getOverviewReport = async ({ shopId, preset, startDate, endDate }) => {
  const { from, to, filter } = resolveDateRange({ preset, startDate, endDate })

  const orders = await prisma.order.findMany({
    where: {
      shopId,
      createdAt: {
        gte: from,
        lt: to,
      },
    },
    select: {
      id: true,
      tokenNo: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      payments: {
        where: {
          status: 'COMPLETED',
        },
        select: {
          method: true,
          amount: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const totalOrderCount = orders.length
  const completedOrdersCount = orders.filter(order => order.status === 'COMPLETED').length
  const cancelledOrderCount = orders.filter(order => order.status === 'CANCELLED').length

  const nonCancelledOrders = orders.filter(order => order.status !== 'CANCELLED')

  const totalRevenueAmount = nonCancelledOrders.reduce((sum, order) => {
    return sum + toNumber(order.totalAmount)
  }, 0)

  const avgOrderValue =
    nonCancelledOrders.length > 0
      ? totalRevenueAmount / nonCancelledOrders.length
      : 0

  const paymentBreakdown = {
    cash: 0,
    upi: 0,
    card: 0,
  }

  let totalCollectedPayments = 0
  let liabilityAmount = 0
  let dueOrderCount = 0

  const hourlyOrderCountMap = {}

  nonCancelledOrders.forEach(order => {
    const orderTotal = toNumber(order.totalAmount)

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

  return {
    filter,
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
  }
}

const resolveDateRange = ({ preset, startDate, endDate }) => {
  if (preset && (startDate || endDate)) {
    throw new ApiError(
      400,
      'Provide either preset or startDate and endDate, not both'
    )
  }

  if (!preset && (!startDate || !endDate)) {
    throw new ApiError(
      400,
      'Either preset or both startDate and endDate are required'
    )
  }

  if (preset) {
    if (!ALLOWED_PRESETS.includes(preset)) {
      throw new ApiError(400, 'Invalid preset. Allowed values are today and yesterday')
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    let from
    let to

    if (preset === 'today') {
      from = new Date(todayStart)
      to = new Date(todayStart)
      to.setDate(to.getDate() + 1)
    }

    if (preset === 'yesterday') {
      from = new Date(todayStart)
      from.setDate(from.getDate() - 1)

      to = new Date(todayStart)
    }

    return {
      from,
      to,
      filter: {
        type: 'preset',
        preset,
        startDate: formatDateOnly(from),
        endDate: formatDateOnly(new Date(to.getTime() - 1)),
      },
    }
  }

  const from = new Date(startDate)
  const to = new Date(endDate)

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new ApiError(400, 'Invalid startDate or endDate')
  }

  from.setHours(0, 0, 0, 0)
  to.setHours(0, 0, 0, 0)
  to.setDate(to.getDate() + 1)

  if (from >= to) {
    throw new ApiError(400, 'endDate must be greater than or equal to startDate')
  }

  return {
    from,
    to,
    filter: {
      type: 'custom',
      startDate: formatDateOnly(from),
      endDate: formatDateOnly(new Date(to.getTime() - 1)),
    },
  }
}

const toNumber = value => Number(value || 0)

const roundToTwo = value => Number(toNumber(value).toFixed(2))

const formatDateOnly = date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}


const getReportOrders = async ({
  shopId,
  preset,
  startDate,
  endDate,
  page = 1,
  limit = 20,
}) => {
  const { from, to, filter } = resolveDateRange({ preset, startDate, endDate })

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
    createdAt: {
      gte: from,
      lt: to,
    },
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
    filter,
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

module.exports = {
  getOverviewReport,
  getReportOrders
}