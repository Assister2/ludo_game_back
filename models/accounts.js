const mongoose = require("mongoose");
const schema = mongoose.Schema;
let userAccount = new mongoose.Schema({
  userId: {
    type: schema.Types.ObjectId,
    ref: "users",
  },
  wallet: {
    type: Number,
    default: 0,
  },
  referelBalance: {
    type: Number,
    default: 0,
  },
  depositCash: {
    type: Number,
    default: 0,
  },
  winningCash: {
    type: Number,
    default: 0,
  },
  bonus: {
    type: Number,
    default: 0,
  },
  totalLose: {
    type: Number,
    default: 0,
  },
  totalPenalty: {
    type: Number,
    default: 0,
  },
  totalWin: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  isBlocked: {
    type: Boolean,
    default: false,
    required: false,
  },
});

userAccount.index({ userId: 1 });

let UserAccount = mongoose.model("UserAccount", userAccount);
UserAccount.createIndexes((err) => {
  if (err) {
    console.error(err);
  } else {
    console.log("Account Indexes created successfully");
  }
});
module.exports = UserAccount;
