const History = require("../models/history");

const historyHelper = {
  /**
   * getAllHistoryByUserId - to get all history of user
   * @returns {Promise<void>}
   */
  getAllHistoryByUserId: async (userId) => {
    try {
      let history = await History.find({ userId });
      return history;
    } catch (error) {
      throw error;
    }
  },
};

module.exports = historyHelper;
