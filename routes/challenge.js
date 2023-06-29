const express = require("express");
const mongoose = require("mongoose");
const accountController = require("../controllers/accounts");
const challengesController = require("../controllers/challenges");
const { responseHandler, uploadFileImage } = require("../helpers");
const verifyToken = require("../middleware/verifyToken");

const Router = express.Router();
const path = require("path");
const currentDate = new Date();
const { handleChallengeCancellation } = require("../function");
const History = require("../models/history");

const mongodb = require("mongodb");
const socket = require("../socket");
const { handleChallengeUpdate } = require("../function");
const axios = require("axios");
// const { MongoClient } = mongodb;
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
// Router.post("/hold/:id", verifyToken, async (req, res) => {
//   let user = req.user;

//   let challenge = await challengesController.getChallengeById(req.params.id);
//   let winner = user.id == challenge.creator._id ? "creator" : "player";

//   let challengeObj = {
//     ...challenge._doc,
//     results: {
//       ...challenge.results,
//       [winner]: {
//         result: "",
//         timeover: true,
//         updatedAt: new Date(),
//       },
//     },
//     state: "hold",
//   };

//   await challenge.save();
//   challenge = await challengesController.updateChallengeById(challengeObj);

//   await userController.updateUserByUserId({
//     _id: user.id,
//     playing: false,
//     noOfChallenges: 0,
//   });

//   return responseHandler(res, 200, challenge, null);
// });
Router.post("/win/:id", verifyToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const io = socket.get();
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
        noOfChallenges: 0,
      });
      let challenge = await challengesController.getChallengeById(
        req.params.id
      );

      let amount = Number(challenge.amount);
      let userWallet = await accountController.getAccountByUserId(user.id);
      console.log("winner---------");
      const image = req.body.image;

      let file = image;
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
      const { roomCode } = challenge;
      let apiResult = null;
      await axios
        .get(`http://128.199.28.12:3000/ludoking/results/${roomCode}`)
        .then((response) => {
          const data = response.data;
          // Process the data received from the API
          console.log("dddd", data);
          apiResult = data;
        })
        .catch((error) => {
          // Handle the error case
          console.error(error);
        });
      // console.log("testtt", response);

      let challengeObj = {
        ...challenge._doc,
        results: {
          [winner]: { result: "win", updatedAt: currentDate },
          [looser]: {
            result: challenge.results[looser].result,
            updatedAt: challenge.results[looser].updatedAt,
          },
        },
        winnerScreenShot: {
          [winner]: file,
          [looser]: challenge.winnerScreenShot[looser],
        },
        apiResult: apiResult,
      };

      if (challenge.results[looser].result == "win") {
        challengeObj.state = "hold";
      }
      //win and no update
      let data = {
        challengeId: req.params.id,
        userId: challenge[looser]._id,
        otherPlayer: looser,
      };
      if (challenge.results[looser].result == "") {
        await handleChallengeUpdate(data);
        io.emit(
          "showTimer",
          JSON.stringify({
            showTimer: true,
            challengeId: req.params.id,
            userId: req.user,
          })
        );
      }
      if (challenge.results[looser].result == "lost") {
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
      if (challenge.results[looser].result == "cancelled") {
        challengeObj.state = "hold";
      }

      challenge = await challengesController.updateChallengeById(challengeObj);
      await session.commitTransaction();
      session.endSession();

      return responseHandler(res, 200, challenge, null);
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.log("error", error);
    return responseHandler(res, 400, null, error.message);
  }
});

Router.post("/loose/:id", verifyToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const io = socket.get();
    if (!req.params.hasOwnProperty("id")) {
      return responseHandler(res, 400, null, "Fields are missing");
    } else {
      let user = req.user;
      await userController.updateUserByUserId({
        _id: user.id,
        playing: false,
        noOfChallenges: 0,
      });
      let challenge = await challengesController.getChallengeById(
        req.params.id
      );
      let looser = user.id == challenge.creator._id ? "creator" : "player";
      let winner = user.id != challenge.creator._id ? "creator" : "player";

      if (challenge.results[looser].result !== "") {
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
      const { roomCode } = challenge;
      let apiResult = null;
      await axios
        .get(`http://128.199.28.12:3000/ludoking/results/${roomCode}`)
        .then((response) => {
          const data = response.data;
          // Process the data received from the API
          console.log("dddd", data);
          apiResult = data;
        })
        .catch((error) => {
          // Handle the error case
          console.error(error);
        });
      let challengeObj = {
        ...challenge._doc,
        //first who sent i lost his result will be saved lost
        results: {
          [looser]: { result: "lost", updatedAt: currentDate },

          [winner]: {
            result: challenge.results[winner].result,
            updatedAt: challenge.results[winner].updatedAt,
          },
        },
        apiResult: apiResult,
      };

      let data = {
        challengeId: req.params.id,
        userId: challenge[winner]._id,
        otherPlayer: winner,
      };
      //if 2nd user result is empty
      if (challenge.results[winner].result == "") {
        handleChallengeUpdate(data);
        io.emit(
          "showTimer",
          JSON.stringify({
            showTimer: true,
            challengeId: req.params.id,
            userId: req.user,
          })
        );
      }
      if (challenge.results[winner].result == "lost") {
        await handleChallengeCancellation(
          challengeObj,
          challenge,
          looser,
          winner,
          looserWallet,
          userWallet
        );
      }

      if (challenge.results[winner].result == "win") {
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
      if (challenge.results[winner].result == "cancelled") {
        challengeObj.state = "hold";
      }
      challenge = await challengesController.updateChallengeById(challengeObj);
      await session.commitTransaction();
      session.endSession();

      return responseHandler(res, 200, challenge, null);
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.log("error", error);
    return responseHandler(res, 400, null, error.message);
  }
});

Router.post("/cancel/:id", verifyToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const io = socket.get();

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
        noOfChallenges: 0,
      });
      let challenge = await challengesController.getChallengeById(
        req.params.id
      );
      let canceller = user.id == challenge.creator._id ? "creator" : "player";
      let otherPlayer = user.id != challenge.creator._id ? "creator" : "player";
      let cancellerWallet = await accountController.getAccountByUserId(
        challenge[canceller]._id
      );
      let otherPlayerWallet = await accountController.getAccountByUserId(
        challenge[otherPlayer]._id
      );
      const { roomCode } = challenge;
      let apiResult = null;
      await axios
        .get(`http://128.199.28.12:3000/ludoking/results/${roomCode}`)
        .then((response) => {
          const data = response.data;
          apiResult = data;
        })
        .catch((error) => {
          // Handle the error case
          console.error(error);
        });
      let challengeObj = {
        ...challenge._doc,
        results: {
          [canceller]: { result: "cancelled", updatedAt: currentDate },

          [otherPlayer]: {
            result: challenge.results[otherPlayer].result,
            updatedAt: challenge.results[otherPlayer].updatedAt,
          },
        },
        apiResult: apiResult,
        cancellationReasons: { [canceller]: req.body.cancellationReason },
      };
      let data = {
        challengeId: req.params.id,
        userId: challenge[otherPlayer]._id,
        otherPlayer: otherPlayer,
      };

      if (challenge.results[otherPlayer].result == "") {
        handleChallengeUpdate(data);
        io.emit(
          "showTimer",
          JSON.stringify({
            showTimer: true,
            challengeId: req.params.id,
            userId: req.user,
          })
        );
      }
      if (challenge.results[otherPlayer].result == "lost") {
        challengeObj.state = "hold";
      }
      if (challenge.results[otherPlayer].result == "win") {
        challengeObj.state = "hold";
      }
      if (challenge.results[otherPlayer].result == "cancelled") {
        // await accountController.updateAccountByUserId({
        //   ...otherPlayer._doc,
        //   wallet: otherPlayer.wallet + challenge.amount,
        //   depositCash:
        //     otherPlayer.depositCash + challenge.playerChips.depositCash,
        //   winningCash:
        //     otherPlayer.winningCash + challenge.playerChips.winningCash,
        // });

        await handleChallengeCancellation(
          challengeObj,
          challenge,
          canceller,
          otherPlayer,
          cancellerWallet,
          otherPlayerWallet
        );
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
      await session.commitTransaction();
      session.endSession();
      return responseHandler(res, 200, challenge, null);
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.log("error", error);
    return responseHandler(res, 400, null, error.message);
  }
});

module.exports = Router;
