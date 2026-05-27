const Joi = require("joi")

const addPaymentsToOrderSchema = Joi.object({
  params: Joi.object({
    orderId: Joi.string().uuid().required(),
  }).required(),

  body: Joi.object({
    payments: Joi.array()
      .items(
        Joi.object({
          method: Joi.string()
            .valid("CASH", "UPI", "CARD", "OTHER")
            .required(),

          amount: Joi.number()
            .positive()
            .precision(2)
            .required(),

          referenceNo: Joi.string()
            .trim()
            .max(100)
            .allow(null, ""),

          cashTendered: Joi.when("method", {
            is: "CASH",
            then: Joi.number()
              .positive()
              .precision(2)
              .required(),
            otherwise: Joi.forbidden(),
          }),
        })
      )
      .min(1)
      .required(),
  }).required(),
})

module.exports = {
  addPaymentsToOrderSchema,
}