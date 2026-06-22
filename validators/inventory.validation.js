const Joi = require("joi");

// POST /api/inventory/:productId
// Provide exactly ONE of:
//   addQuantity — relative increment (e.g. new batch arrived)
//   setQuantity — absolute override  (e.g. physical stock count correction)
// Optionally include reorderLevel and/or note.
const setInventorySchema = Joi.object({
  params: Joi.object({
    productId: Joi.string().uuid().required().messages({
      "string.base": "productId must be a string",
      "string.guid": "productId must be a valid UUID",
      "any.required": "productId is required",
    }),
  }).required(),

  body: Joi.object({
    addQuantity: Joi.number().positive().optional().messages({
      "number.base": "addQuantity must be a number",
      "number.positive": "addQuantity must be greater than 0",
    }),
    setQuantity: Joi.number().min(0).optional().messages({
      "number.base": "setQuantity must be a number",
      "number.min": "setQuantity cannot be negative",
    }),
    reorderLevel: Joi.number().min(0).optional().messages({
      "number.base": "reorderLevel must be a number",
      "number.min": "reorderLevel cannot be negative",
    }),
    note: Joi.string().allow(null, "").optional(),
  })
    .oxor("addQuantity", "setQuantity") // exactly one must be present
    .messages({
      "object.oxor": "Provide either addQuantity or setQuantity, not both",
      "object.missing": "Either addQuantity or setQuantity is required",
    })
    .required(),

  query: Joi.object().unknown(true).optional().default({}),
  headers: Joi.object().unknown(true).optional(),
});

// GET /api/inventory
const getInventorySchema = Joi.object({
  body: Joi.object().optional().default({}),
  query: Joi.object().unknown(true).optional().default({}),
  params: Joi.object().unknown(true).optional().default({}),
  headers: Joi.object().unknown(true).optional(),
});

module.exports = {
  setInventorySchema,
  getInventorySchema,
};
