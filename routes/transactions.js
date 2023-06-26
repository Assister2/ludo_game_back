const express = require("express");
const accountController = require("../controllers/accounts");
const challengesController = require("../controllers/challenges");
const transactionsController = require("../controllers/transactions");
const { responseHandler } = require("../helpers");
const verifyToken = require("../middleware/verifyToken");
const History = require("../models/history");
const router = express.Router();

router.post("/buy", verifyToken, async (req, res) => {
  try {
    if (!req.body.payload) {
      return responseHandler(res, 400, null, "Fields are missing232");
    }
    
    let { amount } = req.body.payload;
    let user = req.user;
    let account = await accountController.getAccountByUserId(user.id);
    // if (amount<=0 || amount>20000) {
    //     return responseHandler( res, 400, account, "Amount limit is 0 to 20000");
    // }
    let transactionObject = {
      amount: amount,
      type: 0, //type 0 is for buying
      status: 1,
      userId: user.id,
    };
    let accountObject = {
      userId: user.id,
      depositCash: Number(account.depositCash + amount),
      wallet: Number(account.wallet + amount),
      withdrawRequest: false,
    };

    await transactionsController.insertNewTransaction(transactionObject);
    account = await accountController.updateAccountByUserId(accountObject);
    let history = new History();
    history.userId = user.id;
    history.historyText = "Chips Added Via UPI";
    history.createdAt = req.body.payload.createdAt;
    history.closingBalance = account.wallet;
    history.amount = Number(amount);
    history.type = "buy";
    await history.save();
    return responseHandler(res, 200, account, null);
  } catch (error) {
    responseHandler(res, 400, null, error.message);
  }
});


router.post("/sell", verifyToken, async (req, res) => {
  try {
    if (
      !req.body.hasOwnProperty("amount") ||
      !req.body.hasOwnProperty("upiId")
    ) {
      return responseHandler(res, 400, null, "Fields are missing");
    }

    let { amount, upiId } = req.body;
    let user = req.user;

    let account = await accountController.getAccountByUserId(user.id);

    let transactionObject = {
      amount: amount,
      type: 1, //type 1 is for selling
      status: 0, // withdrawal request pending 0=pending 1=success
      userId: user.id,
      upiId: upiId,
      withdrawRequest: true,
      withdraw: { lastWRequest: new Date() },
    };
    let checkOpenOrRequested = await challengesController.checkOpenOrRequested(
      user.id
    );

    if (checkOpenOrRequested.length > 0) {
      return responseHandler(
        res,
        400,
        account,
        "You can not sell chips during requested or set challenge"
      );
    }

    let currentTime = new Date();
    // let previousRequest =
    //   await transactionsController.existingTransactionsByUserId(user.id, true);

    // if (previousRequest.length > 0) {
    //   let lastRequest = previousRequest[previousRequest.length - 1];
    //   let timeDifference = currentTime - lastRequest.withdraw.lastWRequest;
    //   if (timeDifference < ONE_DAY_IN_MILLISECONDS) {
    //     let remainingTime = ONE_DAY_IN_MILLISECONDS - timeDifference;
    //     return responseHandler(
    //       res,
    //       400,
    //       account,
    //       `You can only send one withdrawal request in 24 hours. Please wait for ${Math.floor(
    //         remainingTime / (60 * 60 * 1000)
    //       )} hours before sending another request.`
    //     );
    //   }
    // }
    if (amount > account.winningCash) {
      return responseHandler(
        res,
        400,
        account,
        "Amount is less than winning cash"
      );
    } else {
      let accountObject = {
        userId: user.id,
        winningCash: Math.max(0, Number(account.winningCash - amount)),
        wallet: Math.max(0, Number(account.wallet - amount)),
      };
      await transactionsController.insertNewTransaction(transactionObject);

      account = await accountController.updateAccountByUserId(accountObject);
      let history = new History();
      history.userId = user.id;
      history.historyText = "Withdrawal Chips Via UPI";
      history.createdAt = currentTime;
      history.closingBalance = account.wallet;
      history.status = "pending";
      history.amount = Number(amount);
      history.type = "withdraw";
      await history.save();

      return responseHandler(res, 200, account, null);
    }
  } catch (error) {
    responseHandler(res, 400, null, error.message);
  }
});

router.get("/wallet", verifyToken, async (req, res) => {
  try {
    let userId = req.user.id;
    let account = await accountController.getAccountByUserId(userId);
    if (account) {
      return responseHandler(res, 200, account, null);
    } else {
      responseHandler(res, 400, null, "Account not found");
    }
  } catch (error) {
    console.log("error", error);
    responseHandler(res, 400, null, error.message);
  }
});

module.exports = router;
