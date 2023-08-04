const History = require("../models/history");

async function generateHistory(historyObj, session) {
  try {
    const history = new History();
    history.userId = historyObj.userId;
    history.historyText = historyObj.historyText;
    history.createdAt = new Date();
    history.closingBalance = historyObj.closingBalance;
    history.amount = historyObj.amount;
    history.type = historyObj.type;
    if (historyObj.status) {
      history.status = historyObj.status;
    }
    if (historyObj.roomCode) {
      history.roomCode = historyObj.roomCode;
    }
    if (historyObj.transactionId) {
      history.transactionId = historyObj.transactionId;
    }

    await history.save({ session });

    console.log("gener:", history);
    return history;
  } catch (error) {
    console.error("Error creating History", error);
    throw error;
  }
}

module.exports = {
  generateHistory,
};
