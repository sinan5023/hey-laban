const { Prisma, SessionStatus, ExpenseEntryType } = require('@prisma/client')
const prisma = require('../lib/prisma')
const ApiError = require('../helpers/ApiError')
const getBusinessDate = require('../helpers/getBusinessDate')

const toDecimal = (value, fieldName = 'amount') => {
  if (value === undefined || value === null || value === '') {
    return new Prisma.Decimal(0)
  }

  const parsed = Number(value)

  if (Number.isNaN(parsed) || parsed < 0) {
    throw new ApiError(400, `${fieldName} must be a valid non-negative number`)
  }

  return new Prisma.Decimal(parsed)
}

const normalizeCategoryName = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const getTodaySalesSession = async ({ shopId }) => {
  const businessDate = getBusinessDate()

  const session =  prisma.salesSession.findUnique({
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
          createdAt: 'asc',
        },
      },
    },
  })
  if(!session){
    throw new ApiError(409,"Sales session does not exist for today")
  }
  if(session && session.status === "CLOSED"){
    throw new ApiError(409,"The sales ession for today is closed")
  }
  return session
}

const openSalesSession = async ({ shopId, userId, openingCash, openingNote }) => {
  const businessDate = getBusinessDate()

  const existingSession = await prisma.salesSession.findUnique({
    where: {
      shopId_date: {
        shopId,
        date: businessDate,
      },
    },
  })

  if (existingSession) {
    throw new ApiError(409, 'Sales session already exists for today')
  }

  return prisma.salesSession.create({
    data: {
      shopId,
      date: businessDate,
      status: SessionStatus.OPEN,
      openingCash: toDecimal(openingCash, 'openingCash'),
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
  })
}

const closeTodaySalesSession = async ({ shopId, userId, closingNote, expenses = [] }) => {
  const businessDate = getBusinessDate()
  const normalizedExpenses = Array.isArray(expenses) ? expenses : []

  for (const expense of normalizedExpenses) {
    const categoryName = normalizeCategoryName(expense?.categoryName)

    if (!categoryName) {
      throw new ApiError(400, 'Each expense must include a categoryName')
    }

    if (
      expense.amount === undefined ||
      expense.amount === null ||
      expense.amount === ''
    ) {
      throw new ApiError(400, `Amount is required for expense category: ${categoryName}`)
    }

    toDecimal(expense.amount, `${categoryName} amount`)
  }

  return prisma.$transaction(async (tx) => {
    const session = await tx.salesSession.findUnique({
      where: {
        shopId_date: {
          shopId,
          date: businessDate,
        },
      },
    })

    if (!session) {
      throw new ApiError(404, 'No sales session found for today')
    }

    if (session.status !== SessionStatus.OPEN) {
      throw new ApiError(409, 'Today’s sales session is not open')
    }

    if (normalizedExpenses.length > 0) {
      await tx.expense.createMany({
        data: normalizedExpenses.map((expense) => ({
          shopId,
          sessionId: session.id,
          entryType: ExpenseEntryType.SESSION,
          categoryName: normalizeCategoryName(expense.categoryName),
          amount: toDecimal(
            expense.amount,
            `${normalizeCategoryName(expense.categoryName)} amount`
          ),
          note: expense.note ? String(expense.note).trim() || null : null,
          expenseDate: businessDate,
          periodStart: null,
          periodEnd: null,
          createdById: userId,
        })),
      })
    }

    await tx.salesSession.update({
      where: {
        id: session.id,
      },
      data: {
        status: SessionStatus.CLOSED,
        closingNote: closingNote || null,
        closedAt: new Date(),
        closedById: userId,
      },
    })

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
            createdAt: 'asc',
          },
        },
      },
    })
  })
}

const requireTodayOpenSession = async ({ shopId }) => {
  const businessDate = getBusinessDate()

  const session = await prisma.salesSession.findUnique({
    where: {
      shopId_date: {
        shopId,
        date: businessDate,
      },
    },
  })

  if (!session) {
    throw new ApiError(409, 'Sales session is not opened for today')
  }

  if (session.status !== SessionStatus.OPEN) {
    throw new ApiError(409, 'Sales session is closed for today')
  }

  return session
}

module.exports = {
  openSalesSession,
  getTodaySalesSession,
  closeTodaySalesSession,
  requireTodayOpenSession,
}