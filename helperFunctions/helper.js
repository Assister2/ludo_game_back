const History = require("../models/history");
const Account = require("../models/accounts");
const userSockets = require("../allSocketConnection");
const challengesController = require("../controllers/challenges");
const axios = require("axios");
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

    return history;
  } catch (error) {
    console.error("Error creating History", error);
    throw error;
  }
}
function socketOnLogout(userId) {
  try {
    const userIdString = userId.toString();
    if (userSockets.has(userIdString)) {
      const previousSocket = userSockets.get(userIdString);
      previousSocket.disconnect();
      userSockets.delete(userIdString);
      console.log(`Socket connection closed for user ID: ${userId}`);
    }
  } catch (error) {
    console.error("Error disconnecting socket:", error);
  }
}

function calculateChips(account, amount) {
  const chips = { winningCash: 0, depositCash: 0 };

  if (account.depositCash >= amount) {
    account.depositCash -= amount;
    account.wallet -= amount;
    chips.depositCash = amount;
  } else {
    const remaining = amount - account.depositCash;
    if (account.winningCash < remaining) {
      throw new Error(`Insufficient balance for ${account.userId}`);
    } else {
      chips.depositCash = account.depositCash;
      chips.winningCash = remaining;
      account.depositCash = 0;
      account.winningCash -= remaining;
      account.wallet -= amount;
    }
  }

  return chips.depositCash !== 0 || chips.winningCash !== 0 ? chips : null;
}
async function getRoomResults(roomCode) {
  try {
    const response = await axios.get(
      `http://128.199.28.12:3000/ludoking/results/${roomCode}`
    );
    const data = response.data;
    return data;
  } catch (error) {

    throw error;
  }
}
async function getRoomCode() {
  try {
    const roomCodeResponse = await axios.get(
      `http://128.199.28.12:3000/ludoking/roomcode`
    );
    const roomCode = roomCodeResponse.data;
    if (!roomCode) {
      throw new Error("Room code not found");
    }
    return roomCode;
  } catch (error) {
    throw error; // Throw the error to be handled by the caller
  }
}
module.exports = {
  generateHistory,
  getRoomResults,
  getRoomCode,
  calculateChips,
  socketOnLogout,
};
