const Joi = require("joi");

const orderItemSchema = Joi.object({
  productId: Joi.string().uuid().required(),
  quantity: Joi.number().positive().required(),
  note: Joi.string().allow(null, "").optional(),
});
const createOrderSchema = Joi.object({
  body: Joi.object({
    orderType: Joi.string().valid("DINE_IN", "TAKEOUT", "DELIVERY").required(),
    note: Joi.string().allow(null, "").optional(),
    discountAmount: Joi.number().min(0).optional().default(0),
    items: Joi.array().items(orderItemSchema).min(1).required(),
    kotNote: Joi.string().allow(null, "").optional(),
  }).required(),
});

const listOrdersQuery = Joi.object({
  status: Joi.string()
    .valid("OPEN", "COMPLETED", "CANCELLED", "DUE")
    .optional()
    .default(null),

  kotStatus: Joi.string().valid("NEW", "PRINTED").optional().default(null),

  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),

  sortBy: Joi.string()
    .valid("createdAt", "tokenNo", "totalAmount")
    .optional()
    .default("createdAt"),

  sortDir: Joi.string().valid("ASC", "DESC").optional().default("DESC"),
})
  .unknown(false)
  .meta({ className: "ListOrdersQuery" });

// 2. Wrap it into the shape your `validate` expects
const listOrdersSchema = Joi.object({
  body: Joi.object().optional().default({}), // GET APIs have no body

  query: listOrdersQuery, // this is the real validation

  params: Joi.object().unknown(true).optional().default({}), // no path params for /api/orders

  headers: Joi.object().unknown(true).optional(), // optional, allow anything
}).meta({ className: "ListOrdersRequest" });

const getOrderByIdSchema = Joi.object({
  body: Joi.object().optional().default({}),
  query: Joi.object().unknown(true).optional().default({}),
  params: Joi.object({
    orderId: Joi.string().uuid().required(),
  }).required(),
  headers: Joi.object().unknown(true).optional(),
}).meta({ className: "GetOrderByIdRequest" });

const orderItemEditableSchema = Joi.object({
  productId: Joi.string().uuid().required(),
  quantity: Joi.number().positive().required(),
  note: Joi.string().allow(null, "").optional(),
}).meta({ className: "OrderItemEditable" });

// Main PATCH schema for /orders/:orderId
const patchOrderSchema = Joi.object({
  body: Joi.object({
    items: Joi.array()
      .items(orderItemEditableSchema)
      .min(1) // must never be empty
      .required(),
  }).required(),

  query: Joi.object().unknown(true).optional().default({}),
  params: Joi.object({
    orderId: Joi.string().uuid().required(),
  }).required(),
  headers: Joi.object().unknown(true).optional(),
}).meta({ className: "PatchOrderRequest" });


const cancelOrderSchema = Joi.object({
  params: Joi.object({
    orderId: Joi.string().uuid().required().messages({
      'string.base': 'orderId must be a string',
      'string.empty': 'orderId is required',
      'string.guid': 'orderId must be a valid UUID',
      'any.required': 'orderId is required',
    }),
  }).required(),

  body: Joi.object({
    reason: Joi.string().trim().min(3).max(255).required().messages({
      'string.base': 'reason must be a string',
      'string.empty': 'reason is required',
      'string.min': 'reason must be at least 3 characters long',
      'string.max': 'reason cannot exceed 255 characters',
      'any.required': 'reason is required',
    }),
  }).required(),

  query: Joi.object({}).optional(),

  headers: Joi.object({}).optional(),
})

module.exports = {
  cancelOrderSchema,
}

module.exports = {
  createOrderSchema,
  listOrdersSchema,
  getOrderByIdSchema,
  patchOrderSchema,
  cancelOrderSchema
};
