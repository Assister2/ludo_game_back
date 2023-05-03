const Account = require("../models/accounts")


const accountController = {

    getAccountById: async (accountId) => {
        try {
            let account = await Account.findById(accountId)
            return account
        } catch (error) {
            throw error
        }
    }
    ,

    /**
  * insertAccount - insert account .
  * @param object - object that need to insert
  * @returns {Promise<void>}
  */
    insertAccount: async (object) => {
        try {
            let account = new Account(object);
            await account.save();
            return account;
        } catch (error) {
            throw error;
        }
    },



    getAccountByUserId: async (userId) => {
        try {
            let account = await Account.findOne({ userId })
            return account
        } catch (error) {
            throw error
        }
    }

    ,
    updateAccountByUserId: async (accountObject) => {
        try {
            let account = await Account.findOneAndUpdate(
                { userId: accountObject.userId },
                { $set: accountObject },
                { new: true })
            return account
        } catch (error) {
            throw error
        }
    }

    ,
    increaseRefererAccount: async (object) => {
        try {
            let account = await Account.findOneAndUpdate(
                {
                   userId:object.userId
                },
                { $inc: { wallet: +object.amount ,referelBalance:+object.amount,winningCash:+object.amount} }
            );
            return account
        } catch (error) {
            throw error
        }
    },
    decreasePlayersAccount: async (challenge) => {
        try {
            let playerAccount = await Account.findOne({ userId: challenge.player._id })
            let creatorAccount = await Account.findOne({ userId: challenge.creator._id })
            if (playerAccount.depositCash >= challenge.amount) {
                playerAccount._doc.depositCash = playerAccount._doc.depositCash - challenge.amount;
                playerAccount._doc.wallet =  playerAccount._doc.wallet - challenge.amount;
            } else {
                const remaining = challenge.amount - playerAccount.depositCash;
                playerAccount._doc.depositCash = 0;
                playerAccount._doc.winningCash = playerAccount._doc.winningCash - remaining;
                playerAccount._doc.wallet = playerAccount._doc.wallet - challenge.amount;
            }
            if (creatorAccount.depositCash >= challenge.amount) {
                creatorAccount._doc.depositCash = creatorAccount._doc.depositCash - challenge.amount;
                creatorAccount._doc.wallet = creatorAccount._doc.wallet - challenge.amount;

            } else {
                const remaining = challenge.amount - creatorAccount.depositCash;
                creatorAccount._doc.depositCash = 0;
                creatorAccount._doc.winningCash = creatorAccount._doc.winningCash - remaining;
                creatorAccount._doc.wallet = creatorAccount._doc.wallet -  challenge.amount;
            }
            await Account.findOneAndUpdate(
                { userId: creatorAccount.userId },
                { $set: creatorAccount },
                { new: true })

            await Account.findOneAndUpdate(
                { userId: playerAccount.userId },
                { $set: playerAccount },
                { new: true })


            return [playerAccount,creatorAccount]
        } catch (error) {
            throw error
        }
    }
    ,
    increasePlayersAccount: async (challenge) => {
        try {
            let account = await Account.updateMany(
                {
                    $or: [{ userId: challenge.creator }, { userId: challenge.player }],
                },
                { $inc: { wallet: +challenge.amount ,depositCash:+challenge.amount} }
            );
            return account
        } catch (error) {
            throw error
        }
    }
}

module.exports = accountController