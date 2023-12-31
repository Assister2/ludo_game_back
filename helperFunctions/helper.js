const History = require("../models/history");
const axios = require("axios");
const { client } = require("../redis/allSocketConnection");
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
    if (client.has(userIdString)) {
      const previousSocket = client.get(userIdString);
      previousSocket.disconnect();
      client.delete(userIdString);
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
function commissionDeduction(amount) {
  // Convert amount to a number if it's not already
  var numericAmount = Number(amount);

  var newAmount = numericAmount * 2 - (numericAmount * 3) / 100;
  return newAmount;
}
function calculateDeduction(amount) {
  let deduction = amount - amount * 0.03;
  return deduction;
}
module.exports = {
  generateHistory,
  getRoomResults,
  getRoomCode,
  calculateChips,
  calculateDeduction,
  commissionDeduction,
  socketOnLogout,
};
