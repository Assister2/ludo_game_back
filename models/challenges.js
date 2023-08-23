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
  fake: {
    type: Boolean,
    required: false,
    default: false,
  },
  state: {
    type: String,
    default: "open",
    //open requested playing hold cancelled resolved
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
  createdAt: {
    type: Date,
    default: new Date(),
  },
  apiResult: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  startedAt: {
    type: Date,
    default: null,
  },
});

challengeSchema.index({ state: 1 });

const Challenge = mongoose.model("challenges", challengeSchema);

Challenge.createIndexes((err) => {
  if (err) {
    console.error(err);
  } else {
    console.log("Challenge Indexes created successfully");
  }
});
module.exports = Challenge;
