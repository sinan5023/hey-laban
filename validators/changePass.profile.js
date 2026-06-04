// validators/profile/changePassword.schema.js
const Joi = require('joi')

const changePasswordSchema = Joi.object({
    body: Joi.object({
  oldPassword: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.empty': 'Old password is required',
      'string.min': 'Old password must be at least 8 characters',
      'any.required': 'Old password is required',
    }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[a-z]/, 'lowercase')
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[0-9]/, 'number')
    .pattern(/[^A-Za-z0-9]/, 'special character')
    .pattern(/^\S+$/, 'no whitespace')
    .invalid(Joi.ref('oldPassword'))
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 12 characters',
      'string.max': 'New password must not exceed 128 characters',
      'string.pattern.name': 'New password must include uppercase, lowercase, number, special character, and no spaces',
      'any.invalid': 'New password must be different from the old password',
      'any.required': 'New password is required',
    }),
}).required()
})

module.exports = {
  changePasswordSchema,
}