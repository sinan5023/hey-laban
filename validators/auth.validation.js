const Joi = require('joi')

const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().trim().email().required().messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required',
      'string.empty': 'Email is required',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required',
      'string.empty': 'Password is required',
    }),
  }).required(),
})

module.exports = {
  loginSchema,
}