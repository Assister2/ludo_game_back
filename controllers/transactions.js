const TransactionsModel = require("../models/transactions")

const transactionsController = {


      /**
   * insertNewTransaction - transactionObj that need to be insert.
   * @param transactionObj - transactionObj that need to insert
   * @returns {Promise<void>}
   */
    insertNewTransaction: async (transactionObj) => {
        try {
            let response = new TransactionsModel(transactionObj)
            response = await response.save()
            return response
        } catch (error) {
            throw error
        }
    },


    /**
   * existingTransactionsByUserId - Check existing transaction by user id.
   * @param userId - user that need to check
   * @returns {Promise<void>}
   */
    existingTransactionsByUserId: async (userId) => {
        try {
            let response = await TransactionsModel.find({ userId: userId })
            return response
        } catch (error) {
            throw error
        }
    },

        /**
   * existingTransactionsById - Check existing transaction by transactionId id.
   * @param transactionId - transactionId that need to check
   * @returns {Promise<void>}
   */
    existingTransactionsById: async (transactionId) => {
        try {
            let response = await TransactionsModel.findById(transactionId)
            return response
        } catch (error) {
            throw error
        }
    },



}


module.exports = transactionsController