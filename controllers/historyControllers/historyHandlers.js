const historyController = require("../history");
const { responseHandler } = require("../../helpers");

const historyHandler = async (req, res) => {
  try {
    let userId = req.user.id;
    let history = await historyController.getAllHistoryByUserId(userId);
    history.reverse();
    if (history) {
      return responseHandler(res, 200, history, null);
    } else {
      responseHandler(res, 400, null, "user history not found");
    }
  } catch (error) {
    console.log("error", error);
    responseHandler(res, 400, null, error.message);
  }
};

module.exports = {
  historyHandler,
};
