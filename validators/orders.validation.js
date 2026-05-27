const Joi = require("joi");

const orderItemSchema = Joi.object({
  productId: Joi.string().uuid().required(),
  quantity: Joi.number().positive().required(),
  note: Joi.string().allow(null, "").optional(),
});

const createOrderSchema = Joi.object({
  body: Joi.object({
    note: Joi.string().allow(null, "").optional(),
    discountAmount: Joi.number().min(0).optional().default(0),
    items: Joi.array().items(orderItemSchema).min(1).required(),
  }).required(),

  query: Joi.object().unknown(true).optional(),
  params: Joi.object().unknown(true).optional(),
  headers: Joi.object().unknown(true).optional(),
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
  note: Joi.string().allow(null, '').optional(),
})
  .meta({ className: 'OrderItemEditable' });

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
})
  .meta({ className: 'PatchOrderRequest' });

module.exports = { createOrderSchema, listOrdersSchema, getOrderByIdSchema , patchOrderSchema };
