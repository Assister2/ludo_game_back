const number = require("joi/lib/types/number");
const mongoose = require("mongoose");
const schema = mongoose.Schema;
let transactionsSchema = new mongoose.Schema({
  amount: {
    type: Number,
    default: 0,
  },
  type: {
    type: Number, //0 for buy and 1 for sell
    default: 0,
  },
  upiId: {
    type: String,
    default: "",
    require: true,
  },
  status: {
    type: Number, // 0 for failed 1 for success
    default: 0,
  },
  userId: {
    type: schema.Types.ObjectId,
    ref: "users",
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  withdrawRequest: {
    type: Boolean,
    default: false,
  },
  withdraw: {
    noOfRequests: {
      type: Number,
      default: 0,
    },
    lastWRequest: {
      type: Date,
      default: null,
    },
  },
});

let Transactions = mongoose.model("Transactions", transactionsSchema);
module.exports = Transactions;
