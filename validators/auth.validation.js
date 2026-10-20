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

// POST /auth/reset  — send the reset link
const resetLinkSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().trim().email().required().messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required',
      'string.empty': 'Email is required',
    }),
  }).required(),
})

// GET /auth/reset-password/validate?token=...
const resetLinkValidateSchema = Joi.object({
  query: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Token is required',
      'string.empty': 'Token is required',
    }),
  }).required(),
})

// POST /auth/reset-password
const resetPasswordSchema = Joi.object({
  body: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Token is required',
      'string.empty': 'Token is required',
    }),
    newPassword: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'New password is required',
      'string.empty': 'New password is required',
    }),
  }).required(),
})

module.exports = {
  loginSchema,
  resetLinkSchema,
  resetLinkValidateSchema,
  resetPasswordSchema,
}