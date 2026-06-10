const Joi = require("joi");

const getTodaySalesSessionSchema = Joi.object({
  body: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
});

const closeSalesSessionSchema = Joi.object({
  body: Joi.object({
    closingNote: Joi.string().trim().allow("", null).max(500).messages({
      "string.max": "Closing note cannot exceed 500 characters",
    }),

    expenses: Joi.array()
      .items(
        Joi.object({
          categoryName: Joi.string().trim().required().messages({
            "any.required": "Expense categoryName is required",
            "string.empty": "Expense categoryName is required",
          }),

          amount: Joi.number().min(0).precision(2).required().messages({
            "number.base": "Expense amount must be a valid number",
            "number.min": "Expense amount cannot be negative",
            "any.required": "Expense amount is required",
          }),

          note: Joi.string().trim().allow("", null).max(300).messages({
            "string.max": "Expense note cannot exceed 300 characters",
          }),
        }),
      )
      .default([])
      .messages({
        "array.base": "Expenses must be an array",
      }),
  }).required(),

  query: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
});
const openSalesSessionSchema = Joi.object({
  body: Joi.object({
    openingCash: Joi.number().min(0).precision(2).required().messages({
      "number.base": "Opening cash must be a valid number",
      "number.min": "Opening cash cannot be negative",
      "any.required": "Opening cash is required",
    }),

    openingNote: Joi.string().trim().allow("", null).max(500).messages({
      "string.max": "Opening note cannot exceed 500 characters",
    }),
  }).required(),

  query: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
});

const getSalesSessionOverviewSchema = Joi.object({
  body: Joi.object({}).optional(),

  query: Joi.object({
    preset: Joi.string()
      .valid('previous', 'current')
      .required()
      .messages({
        'any.required': 'preset query parameter is required',
        'any.only': 'preset must be either "previous" or "current"',
        'string.base': 'preset must be a string',
      }),
  }).required(),

  params: Joi.object({}).optional(),

  headers: Joi.object({}).optional(),
});

module.exports = {
  getTodaySalesSessionSchema,
  closeSalesSessionSchema,
  openSalesSessionSchema,
  getSalesSessionOverviewSchema
};
