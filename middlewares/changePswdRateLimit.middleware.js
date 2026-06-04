const { rateLimit, ipKeyGenerator } = require('express-rate-limit')

const changePasswordIpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: {
    success: false,
    message: 'Too many password change attempts from this IP. Please try again later.',
    error: null,
  },
})

const changePasswordUserRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || `ip:${ipKeyGenerator(req.ip)}`,
  message: {
    success: false,
    message: 'Too many password change attempts for this account. Please try again later.',
    error: null,
  },
})

module.exports = {
  changePasswordIpRateLimit,
  changePasswordUserRateLimit,
}