const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  amount: {
    type: Number,
    required: true,
  },
  state: {
    type: String,
    default: "open",
    //open requested playing hold cancelled resolved
  },
  status: {
    type: Number,
    default: 1,
    //1 for exist and 0 for deleted
  },
  roomCode: {
    type: String,
    default: 0,
  },
  results: {
    creator: {
      result: {
        type: String,
        default: "",
        // win lose cancelled
      },
      updatedAt: {
        type: Date,
        default: null,
      },
      timeover: {
        type: Boolean,
      },
    },
    player: {
      result: {
        type: String,
        default: "",
        // win lose cancelled
      },
      updatedAt: {
        type: Date,
        default: null,
      },
      timeover: {
        type: Boolean,
      },
    },
  },
  creatorChips: {
    depositCash: {
      type: Number,
      default: 0,
      // win lose cancelled
    },
    winningCash: {
      type: Number,
      default: 0,
      // win lose cancelled
    },
  },
  playerChips: {
    depositCash: {
      type: Number,
      default: 0,
      // win lose cancelled
    },
    winningCash: {
      type: Number,
      default: 0,
      // win lose cancelled
    },
  },
  winnerScreenShot: {
    creator: {
      type: String,
      default: "",
    },
    player: {
      type: String,
      default: "",
    },
  },
  cancellationReasons: {
    creator: {
      type: String,
      default: "",
    },
    player: {
      type: String,
      default: "",
    },
  },
  firstTime: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  apiResult: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  startedAt: {
    type: Date,
    default: null,
  },
});

const Challenge = mongoose.model("challenges", challengeSchema);
module.exports = Challenge;
