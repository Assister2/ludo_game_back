const express = require("express");
const accountController = require("../controllers/accounts");
const challengesController = require("../controllers/challenges");
const { responseHandler, uploadFileImage } = require("../helpers");
const verifyToken = require("../middleware/verifyToken");
const UserAccount = require("../models/accounts");
const Router = express.Router();
const path = require("path");
const History = require("../models/history");
const userController = require("../controllers/user");

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

Router.post("/win/:id", verifyToken, async (req, res) => {
  try {
    if (!req.params.hasOwnProperty("id")) {
      return responseHandler(res, 400, null, "Fields are missing");
    }
    if (!req.body.hasOwnProperty("image")) {
      return responseHandler(res, 400, null, "Fields are missing");
    } else {
      let user = req.user;
      await userController.updateUserByUserId({
        _id: user.id,
        playing: false,
      });
      let challenge = await challengesController.getChallengeById(
        req.params.id
      );
      let amount = Number(challenge.amount);
      let userWallet = await accountController.getAccountByUserId(user.id);
      console.log("winner---------");
      // deduction = (amount * 5) / 100;
      // if (amount >= 500) {
      //     deduction = (amount * 5) / 100;
      // }
      // //doubling the amount and substracting the deduction
      // deductedAmount = amount - deduction;
      // amount = amount * 2 - deduction;

      // // await accountController.updateAccountByUserId({ ...userWallet._doc, wallet: userWallet.wallet + amount, winningCash: userWallet.winningCash + amount })
      const image = req.body.image;
      console.log("winner1---------");
      // Extract the base64 data from the data URL format
      const base64Data = image.replace(/^data:([A-Za-z-+\/]+);base64,/, "");
      let fileName = `public/uploads/challenges/${challenge._id}`;
      let file = uploadFileImage(base64Data, fileName, req.body.fileType);
      let winner = user.id == challenge.creator._id ? "creator" : "player";
      let looser = user.id != challenge.creator._id ? "creator" : "player";

      if (challenge.results[winner !== ""]) {
        return responseHandler(
          res,
          400,
          null,
          "You have already submitted the result"
        );
      }

      let challengeObj = {
        ...challenge._doc,
        results: { [winner]: "win", [looser]: challenge.results[looser] },
        winnerScreenShot: {
          [winner]: file,
          [looser]: challenge.winnerScreenShot[looser],
        },
      };

      if (
        challenge.results[looser] == "" ||
        challenge.results[looser] == "win"
      ) {
        challengeObj.state = "hold";
      }

      if (challenge.results[looser] == "lost") {
        challengeObj.state = "resolved";
        amount = amount * 2 - (amount * 3) / 100;

        let history = new History();
        history.userId = challenge[looser]._id;
        history.historyText = `Lost Against ${challenge[winner].username}`;
        history.createdAt = req.body.createdAt;
        history.roomCode = challenge.roomCode;
        history.amount = Number(challenge.amount);
        history.type = "lost";
        await history.save();

        let historyWinner = new History();
        historyWinner.userId = challenge[winner]._id;
        historyWinner.historyText = `Won Against ${challenge[looser].username}`;
        historyWinner.createdAt = req.body.createdAt;
        historyWinner.roomCode = challenge.roomCode;
        historyWinner.amount = Number(
          challenge.amount - (challenge.amount * 3) / 100
        );
        historyWinner.type = "won";
        await historyWinner.save();

        await accountController.updateAccountByUserId({
          ...userWallet._doc,
          wallet: userWallet.wallet + amount,
          winningCash: userWallet.winningCash + amount,
          totalWin: userWallet.totalWin + challenge.amount,
        });

        let referUser = await userController.existingUserById({
          id: challenge[winner]._id,
        });

        if (referUser.referer) {
          let referalAccount = await userController.existingUserByReferelId(
            referUser.referer
          );

          await accountController.increaseRefererAccount({
            userId: referalAccount._id,
            amount: challenge.amount,
          });
        }
      }
      if (challenge.results[looser] == "cancelled") {
        challengeObj.state = "hold";
      }

      challenge = await challengesController.updateChallengeById(challengeObj);

      return responseHandler(res, 200, challenge, null);
    }
  } catch (error) {
    console.log("error", error);
    return responseHandler(res, 400, null, error.message);
  }
});

Router.post("/loose/:id", verifyToken, async (req, res) => {
  try {
    if (!req.params.hasOwnProperty("id")) {
      return responseHandler(res, 400, null, "Fields are missing");
    } else {
      let user = req.user;
      await userController.updateUserByUserId({
        _id: user.id,
        playing: false,
      });
      let challenge = await challengesController.getChallengeById(
        req.params.id
      );
      let looser = user.id == challenge.creator._id ? "creator" : "player";
      let winner = user.id != challenge.creator._id ? "creator" : "player";

      if (challenge.results[looser] !== "") {
        return responseHandler(
          res,
          400,
          null,
          "You have already submitted the result"
        );
      }
      let winnerUserId = challenge[winner]._id;
      let looserUserId = challenge[looser]._id;
      let amount = Number(challenge.amount);
      let deductedAmount = amount;
      let deduction = 0;
      let userWallet = await accountController.getAccountByUserId(winnerUserId);
      let looserWallet = await accountController.getAccountByUserId(
        looserUserId
      );

      amount = amount * 2 - (amount * 3) / 100;

      let challengeObj = {
        ...challenge._doc,
        results: { [looser]: "lost", [winner]: challenge.results[winner] },
      };
      if (challenge.results[winner] == "") {
        challengeObj.state = "hold";
      }
      if (challenge.results[winner] == "lost") {
        challengeObj.state = "hold";
      }
      if (challenge.results[winner] == "win") {
        let deduction = challenge.amount * 0.03;
        let wall = {
          ...userWallet._doc,
          wallet: userWallet.wallet + amount,
          winningCash: userWallet.winningCash + amount,
          totalWin: userWallet.totalWin + challenge.amount - deduction,
        };

        // challengeObj.state = "resolved"
        challengeObj.state = "resolved";

        let history = new History();
        history.userId = challenge[looser]._id;
        history.historyText = `Lost Against ${challenge[winner].username}`;
        history.createdAt = req.body.createdAt;
        history.roomCode = challenge.roomCode;
        history.closingBalance = looserWallet.wallet;
        history.amount = Number(challenge.amount);
        history.type = "lost";
        await history.save();

        let historyWinner = new History();
        historyWinner.userId = challenge[winner]._id;
        historyWinner.historyText = `Won Against ${challenge[looser].username}`;
        historyWinner.createdAt = req.body.createdAt;
        historyWinner.roomCode = challenge.roomCode;
        historyWinner.closingBalance = wall.wallet;
        historyWinner.amount = Number(
          challenge.amount - (challenge.amount * 3) / 100
        );
        historyWinner.type = "won";
        await historyWinner.save();

        await accountController.updateAccountByUserId(wall);

        let referUser = await userController.existingUserById({
          id: challenge[winner]._id,
        });

        if (referUser.referer) {
          let referalAccount = await userController.existingUserByReferelId(
            referUser.referer
          );

          await accountController.increaseRefererAccount({
            userId: referalAccount._id,
            amount: challenge.amount,
          });
        }

        // let referUser = await userController.existingUserById({ id: challenge[winner]._id })
        // if (referUser.referer) {
        //     let referalAccount = await userController.existingUserByReferelId(referUser.referer)
        //     await accountController.increaseRefererAccount({ userId: referalAccount._id, amount: (challenge.amount * 2) / 100 })
        // }
      }
      if (challenge.results[winner] == "cancelled") {
        challengeObj.state = "hold";
      }
      challenge = await challengesController.updateChallengeById(challengeObj);

      return responseHandler(res, 200, challenge, null);
    }
  } catch (error) {
    console.log("error", error);
    return responseHandler(res, 400, null, error.message);
  }
});

Router.post("/cancel/:id", verifyToken, async (req, res) => {
  try {
    if (!req.params.hasOwnProperty("id")) {
      return responseHandler(res, 400, null, "Fields are missing");
    }
    if (!req.body.hasOwnProperty("cancellationReason")) {
      return responseHandler(res, 400, null, "Fields are missing");
    } else {
      let user = req.user;
      await userController.updateUserByUserId({
        _id: user.id,
        playing: false,
      });
      let challenge = await challengesController.getChallengeById(
        req.params.id
      );
      let canceller = user.id == challenge.creator._id ? "creator" : "player";
      let otherPlayer = user.id != challenge.creator._id ? "creator" : "player";
      // let winnerUserId = challenge[winner]._id
      // let looserUserId = challenge[looser]._id
      // let amount = Number(challenge.amount);
      // let deductedAmount = amount;
      // let deduction = 0;
      let cancellerWallet = await accountController.getAccountByUserId(
        challenge[canceller]._id
      );
      let otherPlayerWallet = await accountController.getAccountByUserId(
        challenge[otherPlayer]._id
      );
      // deduction = (amount * 5) / 100;
      // if (amount >= 500) {
      //     deduction = (amount * 5) / 100;
      // }
      // //doubling the amount and substracting the deduction
      // deductedAmount = amount - deduction;
      // amount = amount * 2 - deduction;
      // await accountController.updateAccountByUserId({ ...userWallet._doc, wallet: userWallet.wallet + amount, winningCash: userWallet.winningCash + amount })

      let challengeObj = {
        ...challenge._doc,
        results: {
          [canceller]: "cancelled",
          [otherPlayer]: challenge.results[otherPlayer],
        },
        cancellationReasons: { [canceller]: req.body.cancellationReason },
      };
      if (challenge.results[otherPlayer] == "") {
        challengeObj.state = "hold";
      }
      if (challenge.results[otherPlayer] == "cancelled") {
        challengeObj.state = "resolved";

        if (
          (canceller == "creator" &&
            challenge.creatorChips != null &&
            challenge.creatorChips.depositCash > 0) ||
          challenge.creatorChips.winningCash > 0
        ) {
          cancellerWallet = await accountController.updateAccountByUserId({
            ...cancellerWallet._doc,
            wallet: cancellerWallet.wallet + challenge.amount,
            depositCash:
              cancellerWallet.depositCash + challenge.creatorChips.depositCash,
            winningCash:
              cancellerWallet.winningCash + challenge.creatorChips.winningCash,
          });
        } else if (
          (canceller == "player" &&
            challenge.playerChips != null &&
            challenge.playerChips.depositCash > 0) ||
          challenge.playerChips.winningCash > 0
        ) {
          cancellerWallet = await accountController.updateAccountByUserId({
            ...cancellerWallet._doc,
            wallet: cancellerWallet.wallet + challenge.amount,
            depositCash:
              cancellerWallet.depositCash + challenge.playerChips.depositCash,
            winningCash:
              cancellerWallet.winningCash + challenge.playerChips.winningCash,
          });
        } else {
          
          cancellerWallet = await accountController.updateAccountByUserId({
            ...cancellerWallet._doc,
            wallet: cancellerWallet.wallet + challenge.amount,
            depositCash: cancellerWallet.depositCash + challenge.amount,
          });
        }

        if (
          (otherPlayer == "creator" &&
            challenge.creatorChips != null &&
            challenge.creatorChips.depositCash > 0) ||
          challenge.creatorChips.winningCash > 0
        ) {
          otherPlayerWallet = await accountController.updateAccountByUserId({
            ...otherPlayerWallet._doc,
            wallet: otherPlayerWallet.wallet + challenge.amount,
            depositCash:
              otherPlayerWallet.depositCash +
              challenge.creatorChips.depositCash,
            winningCash:
              otherPlayerWallet.winningCash +
              challenge.creatorChips.winningCash,
          });
        } else if (
          (otherPlayer == "player" &&
            challenge.playerChips != null &&
            challenge.playerChips.depositCash > 0) ||
          challenge.playerChips.winningCash > 0
        ) {
          otherPlayerWallet = await accountController.updateAccountByUserId({
            ...otherPlayerWallet._doc,
            wallet: otherPlayerWallet.wallet + challenge.amount,
            depositCash:
              otherPlayerWallet.depositCash + challenge.playerChips.depositCash,
            winningCash:
              otherPlayerWallet.winningCash + challenge.playerChips.winningCash,
          });
        } else {
          otherPlayerWallet = await accountController.updateAccountByUserId({
            ...otherPlayerWallet._doc,
            wallet: otherPlayerWallet.wallet + challenge.amount,
            depositCash: otherPlayerWallet.depositCash + challenge.amount,
          });
        }

        // await accountController.updateAccountByUserId({
        //   ...otherPlayerWallet._doc,
        //   wallet: otherPlayerWallet.wallet + challenge.amount,
        //   depositCash: otherPlayerWallet.depositCash + challenge.amount,
        // });
      }

      let historyWinner = new History();
      historyWinner.userId = challenge[canceller]._id;
      historyWinner.historyText = `Cancelled Against ${challenge[otherPlayer].username}`;
      historyWinner.createdAt = req.body.createdAt;
      historyWinner.closingBalance = cancellerWallet.wallet;
      historyWinner.amount = Number(challenge.amount);
      historyWinner.roomCode = challenge.roomCode;
      historyWinner.type = "cancelled";
      await historyWinner.save();
      challenge = await challengesController.updateChallengeById(challengeObj);
      return responseHandler(res, 200, challenge, null);
    }
  } catch (error) {
    console.log("error", error);
    return responseHandler(res, 400, null, error.message);
  }
});

module.exports = Router;
