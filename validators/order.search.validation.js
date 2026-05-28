const Joi = require("joi")

const searchTicketsSchema = Joi.object({
  query: Joi.object({
    q: Joi.string()
      .trim()
      .uppercase()
      .pattern(/^(ORD|KOT)-[A-Z0-9-]+$/)
      .required(),
  }).required(),
})

module.exports = {
  searchTicketsSchema,
}