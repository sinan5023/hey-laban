const catalogueService = require("../services/catelogue.service");
const { sendSuccess, sendError } = require("../helpers/response");

const getCatalogue = async (req, res) => {
  try {
    const result = await catalogueService.getCatalogue({
      shopId: req.user.shopId,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: "Catalogue fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get catalogue error:", error);

    return sendError(res, {
      statusCode: error.statusCode || 500,
      message: error.message || "Internal server error",
      error: error.error || null,
    });
  }
};

module.exports = {
  getCatalogue,
};