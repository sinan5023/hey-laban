// schemas/kots.schema.js
const Joi = require('joi')

const createKotSchema = Joi.object({
  params: Joi.object({
    orderId: Joi.string().uuid().required(),
  }).required(),

  body: Joi.object({
    note: Joi.string().trim().allow('', null).optional(),
  }).optional(),

  query: Joi.object({}).optional(),

  headers: Joi.object({}).optional(),
})

module.exports = {
  createKotSchema,
}