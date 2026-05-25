const { sendError } = require('../helpers/response')

const validate = (schema) => {
  return (req, res, next) => {
    const validationPayload = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    }

    const { error, value } = schema.validate(validationPayload, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    })

    if (error) {
      return sendError(res, {
        statusCode: 400,
        message: 'Validation failed',
        error: error.details.map((item) => ({
          message: item.message,
          path: item.path,
        })),
      })
    }

    req.body = value.body || req.body
    req.query = value.query || req.query
    req.params = value.params || req.params

    next()
  }
}

module.exports = validate