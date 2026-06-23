const Joi = require("joi");

const createRawMaterialSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().required().messages({
      "string.base": "name must be a string",
      "any.required": "name is required",
    }),
    inHandCount: Joi.number().min(0).optional().default(0).messages({
      "number.base": "inHandCount must be a number",
      "number.min": "inHandCount cannot be negative",
    }),
    reorderLevel: Joi.number().min(0).optional().default(0).messages({
      "number.base": "reorderLevel must be a number",
      "number.min": "reorderLevel cannot be negative",
    }),
  }).required(),
  query: Joi.object().unknown(true).optional().default({}),
  headers: Joi.object().unknown(true).optional(),
});

const setRawMaterialStockSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.base": "id must be a string",
      "string.guid": "id must be a valid UUID",
      "any.required": "id is required",
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
    .oxor("addQuantity", "setQuantity")
    .messages({
      "object.oxor": "Provide either addQuantity or setQuantity, not both",
      "object.missing": "Either addQuantity or setQuantity is required",
    })
    .required(),

  query: Joi.object().unknown(true).optional().default({}),
  headers: Joi.object().unknown(true).optional(),
});

const listRawMaterialsSchema = Joi.object({
  query: Joi.object().unknown(true).optional().default({}),
  headers: Joi.object().unknown(true).optional(),
});

module.exports = {
  createRawMaterialSchema,
  setRawMaterialStockSchema,
  listRawMaterialsSchema,
};
