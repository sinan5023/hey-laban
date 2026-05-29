const catalogueService = require("../services/catelogue.service");
const { sendSuccess, sendError } = require("../helpers/response");

const getCatalogue = async (req, res , next) => {
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
    next(error)
  }
};

module.exports = {
  getCatalogue,
};