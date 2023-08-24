const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const Router = express.Router();
const {
  handleWin,
  handleLost,
  handleCancel,
  handleUpdateResult,
  getChallengeByChallengeId,
} = require("../controllers/challengesControllers/challengesHandlers");

Router.get(
  "/getChallengeByChallengeId/:challengeId",
  verifyToken,
  getChallengeByChallengeId
);

Router.post("/win/:id", verifyToken, handleWin);

Router.post("/loose/:id", verifyToken, handleLost);

Router.post("/cancel/:id", verifyToken, handleCancel);

module.exports = Router;
