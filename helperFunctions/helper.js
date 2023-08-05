const History = require("../models/history");
const Account = require("../models/accounts");

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

async function balanceMinus(updatedChallenge, session) {
  try {
    let creatorChips = { winningCash: 0, depositCash: 0 };
    let playerChips = { winningCash: 0, depositCash: 0 };
    let playerAccount = await Account.findOne({
      userId: updatedChallenge.player._id,
    });
    let creatorAccount = await Account.findOne({
      userId: updatedChallenge.creator._id,
    });
    if (playerAccount.depositCash >= updatedChallenge.amount) {
      playerAccount.depositCash -= updatedChallenge.amount;
      playerAccount.wallet -= updatedChallenge.amount;
      playerChips.depositCash = updatedChallenge.amount;
    } else if (playerAccount.depositCash < updatedChallenge.amount) {
      const remaining = updatedChallenge.amount - playerAccount.depositCash;
      if (playerAccount.winningCash < remaining) {
        throw new Error("Insufficient balance for Player");
      } else {
        playerChips = {
          depositCash: playerAccount.depositCash,
          winningCash: remaining,
        };
        playerAccount.depositCash = 0;
        playerAccount.winningCash -= remaining;
        playerAccount.wallet -= updatedChallenge.amount;
      }
    }

    if (creatorAccount.depositCash >= updatedChallenge.amount) {
      creatorAccount.depositCash -= updatedChallenge.amount;
      creatorAccount.wallet -= updatedChallenge.amount;
      creatorChips.depositCash = updatedChallenge.amount;
    } else if (creatorAccount.depositCash < updatedChallenge.amount) {
      const remaining = updatedChallenge.amount - creatorAccount.depositCash;

      if (creatorAccount.winningCash < remaining) {
        throw new Error("Insufficient balance for creator");
      } else {
        creatorChips = {
          depositCash: creatorAccount.depositCash,
          winningCash: remaining,
        };
        creatorAccount.depositCash = 0;
        creatorAccount.winningCash -= remaining;
        creatorAccount.wallet -= updatedChallenge.amount;
      }
    }

    await Account.findOneAndUpdate(
      { userId: creatorAccount.userId },
      { $set: creatorAccount },
      { new: true, session }
    );

    await Account.findOneAndUpdate(
      { userId: playerAccount.userId },
      { $set: playerAccount },
      { new: true, session }
    );
  } catch (error) {
    console.error("StartGame ", error);
    throw error;
  }
}

module.exports = {
  generateHistory,
  balanceMinus,
};
