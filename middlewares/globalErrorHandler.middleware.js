const { sendError } = require("../helpers/response")

const errorHandler = (error, req, res, next) => {
  console.error(error)

  return sendError(res, {
    statusCode: error.statusCode || 500,
    message: error.message || "Internal server error",
    error: error.error || null,
  })
}

module.exports = errorHandler