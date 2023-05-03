const express = require("express");
const accountController = require("../controllers/accounts");
const challengesController = require("../controllers/challenges");
const transactionsController = require("../controllers/transactions");
const { responseHandler } = require("../helpers");
const verifyToken = require("../middleware/verifyToken");
const History = require("../models/history");
const router = express.Router()

router.post("/buy", verifyToken, async (req, res) => {
    try {
        if (!req.body.hasOwnProperty("amount")) {
            return responseHandler(res, 400, null, "Fields are missing");
        }
     
        let { amount } = req.body
        let user = req.user
        let account = await accountController.getAccountByUserId(user.id)
        // if (amount<=0 || amount>20000) {
        //     return responseHandler(res, 400, account, "Amount limit is 0 to 20000");
        // }
        let transactionObject = {
            amount: amount,
            type: 0,//type 0 is for buying
            status: 1,
            userId: user.id
        }
        let accountObject = {
            userId: user.id,
            depositCash: Number(account.depositCash + amount),
            wallet: Number(account.wallet + amount)
        }

        await transactionsController.insertNewTransaction(transactionObject)
        account = await accountController.updateAccountByUserId(accountObject)
        let history = new History()
        history.userId = user.id
        history.historyText = "Chips Added Via UPI"
        history.createdAt = req.body.createdAt
        history.closingBalance = account.wallet
        history.amount = Number(amount)
        history.type = "buy"
        await history.save()
        return responseHandler(res, 200, account, null);

    } catch (error) {
        responseHandler(res, 400, null, error.message);
    }
})


router.post("/sell", verifyToken, async (req, res) => {
    try {
        if (!req.body.hasOwnProperty("amount") ||
            !req.body.hasOwnProperty("upiId")
        ) {
            return responseHandler(res, 400, null, "Fields are missing");
        }
        let { amount, upiId } = req.body
        // if (amount<=95 || amount>10000) {
        //     return responseHandler(res, 400, account, "Sell limit is 95 to 10000");
        // }
        
        let user = req.user
        let account = await accountController.getAccountByUserId(user.id)

        let transactionObject = {
            amount: amount,
            type: 1,//type 1 is for selling
            status: 1,
            userId: user.id,
            upiId: upiId
        }
        let checkOpenOrRequested = await challengesController.checkOpenOrRequested(user.id)
        console.log("check open",checkOpenOrRequested)
        if(checkOpenOrRequested.length>0){
            return responseHandler(res, 400, account, "You can not sell chips during requested or set challenge");
        }

        if (+amount > account.winningCash) {
            return responseHandler(res, 400, account, "Amount is less then winning cash");
        }
        else {
            let accountObject = {
                userId: user.id,
                winningCash: Number(account.winningCash - amount),
                wallet: Number(account.wallet - amount)
            }
            await transactionsController.insertNewTransaction(transactionObject)
            account = await accountController.updateAccountByUserId(accountObject)
            let history = new History()
            history.userId = user.id
            history.history$Text = "Withdrawal Chips Via UPI"
            history.createdAt = req.body.createdAt
            history.closingBalance = account.wallet
            history.status = "pending"
            history.amount = Number(amount)
            history.type = "withdraw"
            await history.save()
            return responseHandler(res, 200, account, null)
        }

        ;

    } catch (error) {
        responseHandler(res, 400, null, error.message);
    }
})

router.get("/wallet",verifyToken, async(req,res)=>{
    try {
        let userId = req.user.id
        let account = await accountController.getAccountByUserId(userId)
        if(account){
            return responseHandler(res, 200, account, null)
        }
        else{
            responseHandler(res, 400, null, "Account not found");
        }

    } catch (error) {
        console.log("error",error)
        responseHandler(res, 400, null, error.message);
    }

})

module.exports = router