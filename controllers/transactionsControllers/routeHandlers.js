const {
  accountController,
  challengesController,
  transactionsController,
  userController,
  responseHandler,
  History,
} = require("../../commonImports/commonImports");
const getUPILink = require("./paymentUPI");
const mongoose = require("mongoose");

async function handleBuyChips(req, res) {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    if (!req.body.payload) {
      return responseHandler(res, 400, null, "Fields are missing");
    }

    const { amount } = req.body.payload;
    const { user } = req;
    if (amount <= 0 || amount > 20000) {
      return responseHandler(res, 400, {}, "Amount limit is 0 to 20000");
    }
    const User = await userController.existingUserById({
      id: user.id,
    });
    const transactionObject = {
      amount: amount,
      type: 0, //type 0 is for buying 1 for withdraw
      status: 2, // 0 for failed 1 for success and 2 for pending
      userId: user.id,
    };
    const Transaction = await transactionsController.insertNewTransaction(
      transactionObject,
      session
    );
    console.log("userByid", User);
    const paymentUrl = await getUPILink(Transaction._id, amount, User);
    await session.commitTransaction();
    session.endSession();

    return responseHandler(res, 200, paymentUrl, null);
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.log("BuyChipError", error);
    throw error;
  }
}

async function handleSellChips(req, res) {
  const session = await mongoose.startSession();
  try {
    const { amount, upiId } = req.body;
    const { user } = req;

    if (typeof amount !== "number" || typeof upiId !== "string") {
      return responseHandler(res, 400, null, "Fields are missing or invalid");
    }

    const checkOpenOrRequested =
      await challengesController.checkOpenOrRequested(user.id);
    if (checkOpenOrRequested.length > 0) {
      return responseHandler(
        res,
        400,
        account,
        "You cannot sell chips during requested or set challenge"
      );
    }

    const account = await accountController.getAccountByUserId(user.id);
    if (!account) {
      return responseHandler(res, 404, null, "Account not found");
    }

    if (amount > account.winningCash) {
      return responseHandler(
        res,
        400,
        account,
        "Amount is less than winning cash"
      );
    }

    let transactionId;
    let updatedAccount;

    await session.withTransaction(async () => {
      const accountObject = {
        userId: user.id,
        winningCash: Math.max(0, account.winningCash - amount),
        wallet: Math.max(0, account.wallet - amount),
      };

      updatedAccount = await accountController.updateAccountByUserId(
        accountObject,
        session
      );

      const transactionObject = {
        amount: amount,
        type: 1, //type 1 is for selling
        status: 0, // withdrawal request pending 0=pending 1=success
        userId: user.id,
        upiId: upiId,
        withdrawRequest: true,
        withdraw: { lastWRequest: new Date() },
      };

      transactionId = await transactionsController.insertNewTransaction(
        transactionObject,
        session
      );

      const history = new History();
      history.userId = user.id;
      history.historyText = "Withdrawal Chips Via UPI";
      history.createdAt = new Date();
      history.closingBalance = updatedAccount.wallet;
      history.status = "pending";
      history.amount = Number(amount);
      history.type = "withdraw";
      history.transactionId = transactionId._id;
      await history.save({ session });
    });

    return responseHandler(res, 200, updatedAccount, null);
  } catch (error) {
    console.log("error", error);
    throw error;
  } finally {
    session.endSession();
  }
}

async function handleGetWallet(req, res) {
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
}
async function ConfirmPayment(req, res) {
  try {
    console.log("confirmpayment working");
    const data = req.body;
    const { amount } = data;
    console.log("webhookstatus", data);
    console.log("reqqqq", req);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userTransaction =
        await transactionsController.existingTransactionsById(
          data.client_txn_id
        );
      await transactionsController.updateTransactionById(userTransaction._id);
      const account = await accountController.getAccountByUserId(
        userTransaction.userId
      );
      const accountObject = {
        userId: userTransaction.userId,
        depositCash: account.depositCash + amount,
        wallet: account.wallet + amount,
        withdrawRequest: false,
      };

      const updatedAccount = await accountController.updateAccountByUserId(
        accountObject,
        session
      );

      const history = new History();
      history.userId = userTransaction.userId;
      history.historyText = "Chips Added Via UPI";
      history.createdAt = new Date();
      history.closingBalance = updatedAccount.wallet;
      history.amount = Number(amount);
      history.type = "buy";
      history.transactionId = userTransaction._id;

      await history.save({ session });

      await session.commitTransaction();
      session.endSession();

      return responseHandler(res, 200, {}, null);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.log("error", error);
      responseHandler(res, 400, null, error.message);
    }
  } catch (error) {
    console.log("error", error);
    responseHandler(res, 400, null, error.message);
  }
}
module.exports = {
  handleBuyChips,
  handleSellChips,
  handleGetWallet,
  ConfirmPayment,
};
