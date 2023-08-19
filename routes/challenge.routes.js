const express = require("express");
const challengesController = require("../controllers/challenges");
const { responseHandler } = require("../helpers");
const verifyToken = require("../middleware/verifyToken");
const Router = express.Router();
const {
  handleWin, handleLost, handleCancel, handleUpdateResult,
} = require("../controllers/challengesControllers/challengesHandlers");

Router.get(
  "/getChallengeByChallengeId/:challengeId",
  verifyToken,
  async (req, res) => {
    try {
      if (!req.params.hasOwnProperty("challengeId")) {
        return responseHandler(res, 400, null, "Fields are missing");
      }
      let user = req.user;
      let challenge = await challengesController.getChallengeById(
        req.params.challengeId
      );
      if (!challenge) {
        return responseHandler(res, 400, null, "Challenge not found");
      } else {
        if (
          (challenge.creator._id.toString() == user.id.toString() ||
            challenge.player._id.toString() == user.id.toString()) &&
          challenge.state == "started"
        ) {
          return responseHandler(res, 200, challenge, null);
        } else {
          responseHandler(res, 400, null, "Challenge not found");
        }
      }
    } catch (error) {}
  }
);

Router.post("/win/:id", verifyToken, handleWin);

Router.post("/loose/:id", verifyToken, handleLost);

Router.post("/cancel/:id", verifyToken, handleCancel);
Router.post("/updateResult/:id", verifyToken, handleUpdateResult);

module.exports = Router;
