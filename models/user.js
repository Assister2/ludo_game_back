const mongoose = require("mongoose");
let userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  profileImage: {
    type: String,
    required: true,
    default: "2.png",
  },
  phone: {
    type: String,
    minlength: 10,
    maxlength: 10,
  },
  joinedAt: {
    type: Date,
    required: false,
    default: new Date(),
  },
  playing: {
    type: Boolean,
    required: false,
    default: false,
  },
  otpConfirmed: {
    type: Boolean,
    required: false,
    default: false,
  },
  otp: {
    code: {
      type: Number,
      require: false,
    },
    updatedAt: {
      type: Date,
      default: Date(),
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  referer: {
    type: Number,
  },
  totalRefer: {
    type: Number,
    default: 0,
  },
  referBallance: {
    type: Number,
    default: 0,
  },
  referelCode: {
    type: Number,
  },
  // total cash
  wallet: {
    type: Number,
    default: 0,
  },
  // winning cash

  // depositCash
  depositCash: {
    type: Number,
    default: 0,
  },

  winningCash: {
    type: Number,
    default: 0,
  },

  playerInfo: {
    totalWin: {
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
  },
  isBlocked: {
    type: Boolean,
    default: false,
    required: false,
  },
  hasActiveChallenge: {
    type: Boolean,
    default: false,
    required: false,
  },
  jwtToken: {
    jwtToken: { type: String, default: "" },
    createdAt: { type: Date, default: new Date() },
  },
  loggedDevices: [
    {
      notificationToken: { type: String, default: "" },
      deviceId: { type: String, required: true },
      jwtToken: { type: String, default: "" },
      ipAddress: { type: String, default: "" },
      createdAt: { type: Date, default: new Date() },
    },
  ],
});

let User = mongoose.model("User", userSchema);
module.exports = User;
