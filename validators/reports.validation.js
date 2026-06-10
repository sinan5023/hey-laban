const Joi = require('joi')

const sessionOrDateRangeSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  headers: Joi.object({}).optional(),
  query: Joi.object({
    sessionId: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.guid': 'sessionId must be a valid UUID',
      }),
    startDate: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .messages({
        'string.pattern.base': 'startDate must be in YYYY-MM-DD format',
      }),
    endDate: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .messages({
        'string.pattern.base': 'endDate must be in YYYY-MM-DD format',
      }),
  })
    .custom((value, helpers) => {
      const { sessionId, startDate, endDate } = value
      const hasSession = !!sessionId
      const hasStartDate = !!startDate
      const hasEndDate = !!endDate

      if (hasSession && (hasStartDate || hasEndDate)) {
        return helpers.message('Provide either sessionId or startDate and endDate, not both')
      }

      if (!hasSession && !hasStartDate && !hasEndDate) {
        return helpers.message('Either sessionId or both startDate and endDate are required')
      }

      if (!hasSession && hasStartDate && !hasEndDate) {
        return helpers.message('endDate is required when startDate is provided')
      }

      if (!hasSession && !hasStartDate && hasEndDate) {
        return helpers.message('startDate is required when endDate is provided')
      }

      if (!hasSession && hasStartDate && hasEndDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)

        if (Number.isNaN(start.getTime())) {
          return helpers.message('startDate must be a valid date')
        }

        if (Number.isNaN(end.getTime())) {
          return helpers.message('endDate must be a valid date')
        }

        if (start > end) {
          return helpers.message('endDate must be greater than or equal to startDate')
        }
      }

      return value
    })
    .required(),
})

const closedSalesSessionsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  headers: Joi.object({}).optional(),
  query: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.base': 'page must be a number',
        'number.integer': 'page must be an integer',
        'number.min': 'page must be greater than or equal to 1',
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .messages({
        'number.base': 'limit must be a number',
        'number.integer': 'limit must be an integer',
        'number.min': 'limit must be greater than or equal to 1',
        'number.max': 'limit must be less than or equal to 100',
      }),
  }).optional(),
})

const reportOrdersSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  headers: Joi.object({}).optional(),
  query: sessionOrDateRangeSchema.extract('query').keys({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.base': 'page must be a number',
        'number.integer': 'page must be an integer',
        'number.min': 'page must be greater than or equal to 1',
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .messages({
        'number.base': 'limit must be a number',
        'number.integer': 'limit must be an integer',
        'number.min': 'limit must be greater than or equal to 1',
        'number.max': 'limit must be less than or equal to 100',
      }),
  }).required()
})

module.exports = {
  sessionOrDateRangeSchema,
  closedSalesSessionsSchema,
  reportOrdersSchema,
}