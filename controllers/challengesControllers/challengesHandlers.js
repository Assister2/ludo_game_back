const mongoose = require("mongoose");
const accountController = require("../../controllers/accounts");
const challengesController = require("../../controllers/challenges");
const { responseHandler } = require("../../helpers");

const {
  handleChallengeUpdate,
  handleChallengeCancellation,
} = require("../../function");
const userController = require("../../controllers/user");
const {
  generateHistory,
  getRoomResults,
  commissionDeduction,
  calculateDeduction,
} = require("../../helperFunctions/helper");
const { otherPlyerLost } = require("../challengeConditions");

async function handleWin(req, res) {
  if (!req.params.hasOwnProperty("id")) {
    return responseHandler(res, 400, null, "Fields are missing");
  }
  if (!req.body.hasOwnProperty("image")) {
    return responseHandler(res, 400, null, "Fields are missing");
  }
  let challenge = await challengesController.getPlayingChallengeById(
    req.params.id
  );
  if (!challenge) {
    return responseHandler(res, 400, null, "result already updated");
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = req.user;
    const currentUserIs =
      user.id == challenge.creator._id ? "creator" : "player";
    const otherPlayerIs =
      user.id != challenge.creator._id ? "creator" : "player";
    if (challenge.results[currentUserIs !== ""]) {
      return responseHandler(
        res,
        400,
        null,
        "You have already submitted the result"
      );
    }
    const amount = commissionDeduction(challenge.amount);

    const image = req.body.image;
    const file = image;
    const { roomCode } = challenge;
    let apiResult = null;
    if (!challenge.apiResult) {
      apiResult = await getRoomResults(roomCode);
    }
    let challengeObj = {
      ...challenge._doc,
      results: {
        [currentUserIs]: { result: "win", updatedAt: new Date() },
        [otherPlayerIs]: {
          result: challenge.results[otherPlayerIs].result,
          updatedAt: challenge.results[otherPlayerIs].updatedAt,
        },
      },
      winnerScreenShot: {
        [currentUserIs]: file,
        [otherPlayerIs]: challenge.winnerScreenShot[otherPlayerIs],
      },
    };
    if (apiResult !== null) {
      challengeObj.apiResult = apiResult;
    }
    if (challenge.results[otherPlayerIs].result == "win") {
      challengeObj.state = "hold";
    }
    if (challenge.results[otherPlayerIs].result == "cancelled") {
      challengeObj.state = "hold";
    }
    if (challenge.results[otherPlayerIs].result == "") {
      let data = {
        challengeId: req.params.id,
        userId: challenge[otherPlayerIs]._id,
        otherPlayer: otherPlayerIs,
      };
      await handleChallengeUpdate(data);
    }
    if (challenge.results[otherPlayerIs].result == "lost") {
      challengeObj.state = "resolved";
      let deduction = calculateDeduction(challenge.amount);
      const winnerUpdatedAccount =
        await accountController.winningGameAccountUpdate(
          {
            userId: user.id,
            wallet: amount,
            winningCash: amount,
            totalWin: deduction,
          },
          session
        );
      let looserWallet = await accountController.getAccountByUserId(
        challenge[otherPlayerIs]._id
      );
      const historyObj = {
        userId: challenge[otherPlayerIs]._id,
        historyText: `Lost Against ${challenge[currentUserIs].username}`,
        roomCode: challenge.roomCode,
        closingBalance: looserWallet.wallet,
        amount: Number(challenge.amount),
        type: "lost",
      };
      await generateHistory(historyObj, session);
      const winnerObj = {
        userId: challenge[currentUserIs]._id,
        historyText: `Won Against ${challenge[otherPlayerIs].username}`,
        roomCode: challenge.roomCode,
        closingBalance: winnerUpdatedAccount.wallet,
        amount: Number(amount),
        type: "won",
      };
      await generateHistory(winnerObj, session);
      let referUser = await userController.existingUserById({
        id: challenge[currentUserIs]._id,
      });
      if (referUser.referer) {
        const referralUser = await userController.existingUserByReferelId(
          referUser.referer
        );
        const referralUserWallet =
          await accountController.increaseRefererAccount(
            {
              userId: referralUser._id,
              amount: challenge.amount,
            },
            session
          );
        const historyObj = {
          userId: referralUserWallet.userId,
          historyText: `referal from ${challenge[currentUserIs].username}`,
          roomCode: challenge.roomCode,
          closingBalance: referralUserWallet.wallet,
          amount: Number(challenge.amount * 0.02),
          type: "referal",
        };
        await generateHistory(historyObj, session);
      }
    }

    await userController.updateUserByUserId(
      {
        _id: user.id,
        noOfChallenges: 0,
      },
      session
    );
    challenge = await challengesController.updateChallengeById(
      challengeObj,
      session
    );

    await session.commitTransaction();
    session.endSession();

    return responseHandler(res, 200, challenge, null);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
async function handleLost(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.params.hasOwnProperty("id")) {
      return responseHandler(res, 400, null, "Fields are missing");
    } else {
      let challenge = await challengesController.getPlayingChallengeById(
        req.params.id
      );
      if (!challenge) {
        return responseHandler(res, 400, null, "result already updated");
      }
      let user = req.user;
      let looser = user.id == challenge.creator._id ? "creator" : "player";
      let winner = user.id != challenge.creator._id ? "creator" : "player";

      if (challenge.results[looser].result !== "") {
        return responseHandler(res, 400, null, "result already updatedd");
      }

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
      if (!challenge.apiResult) {
        getRoomResults(roomCode)
          .then((data) => {
            apiResult = data;
          })
          .catch((error) => {
            throw error;
          });
      }
      let challengeObj = {
        ...challenge._doc,
        results: {
          [looser]: { result: "lost", updatedAt: new Date() },

          [winner]: {
            result: challenge.results[winner].result,
            updatedAt: challenge.results[winner].updatedAt,
          },
        },
      };
      if (apiResult !== null) {
        challengeObj.apiResult = apiResult;
      }
      let data = {
        challengeId: req.params.id,
        userId: challenge[winner]._id,
        otherPlayer: winner,
      };
      if (challenge.results[winner].result == "") {
        handleChallengeUpdate(data);
      }
      if (challenge.results[winner].result == "lost") {
        await handleChallengeCancellation(
          challengeObj,
          challenge,
          looser,
          winner,
          looserWallet,
          userWallet,
          session
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

        const historyObj = {
          userId: challenge[looser]._id,
          historyText: `Lost Against ${challenge[winner].username}`,
          roomCode: challenge.roomCode,
          closingBalance: looserWallet.wallet,
          amount: Number(amount),
          type: "lost",
        };
        await generateHistory(historyObj, session);

        const winnerObj = {
          userId: challenge[winner]._id,
          historyText: `Won Against ${challenge[looser].username}`,
          roomCode: challenge.roomCode,
          closingBalance: wall.wallet,
          amount: Number(challenge.amount * 2 - (challenge.amount * 3) / 100),
          type: "won",
        };
        await generateHistory(winnerObj, session);

        await accountController.updateAccountByUserId(wall, session);

        let referUser = await userController.existingUserById({
          id: challenge[winner]._id,
        });

        if (referUser.referer) {
          let referalAccount = await userController.existingUserByReferelId(
            referUser.referer
          );

          const updatedReferAccount =
            await accountController.increaseRefererAccount(
              {
                userId: referalAccount._id,
                amount: challenge.amount,
              },
              session
            );

          const historyObj = {
            userId: updatedReferAccount.userId,
            historyText: `referal from ${challenge[winner].username}`,
            roomCode: challenge.roomCode,
            closingBalance: updatedReferAccount.wallet,
            amount: Number(challenge.amount * 0.02),
            type: "referal",
          };
          await generateHistory(historyObj, session);
        }
      }
      if (challenge.results[winner].result == "cancelled") {
        challengeObj.state = "hold";
      }
      await userController.updateUserByUserId(
        {
          _id: user.id,
          noOfChallenges: 0,
        },
        session
      );
      challenge = await challengesController.updateChallengeById(
        challengeObj,
        session
      );
      await session.commitTransaction();
      session.endSession();

      return responseHandler(res, 200, challenge, null);
    }
  } catch (error) {
    await session.abortTransaction();

    console.log("error", error);
    return responseHandler(res, 400, null, error.message);
  } finally {
    session.endSession();
  }
}
async function handleCancel(req, res) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    if (!req.params.hasOwnProperty("id")) {
      return responseHandler(res, 400, null, "Fields are missing");
    }
    if (!req.body.hasOwnProperty("cancellationReason")) {
      return responseHandler(res, 400, null, "Fields are missing");
    } else {
      let challenge = await challengesController.getPlayingChallengeById(
        req.params.id
      );
      if (!challenge) {
        return responseHandler(res, 400, null, "result already updated");
      }
      let user = req.user;
      let canceller = user.id == challenge.creator._id ? "creator" : "player";
      let otherPlayer = user.id != challenge.creator._id ? "creator" : "player";

      if (challenge.results[canceller].result !== "") {
        return responseHandler(res, 400, null, "result already updatedd");
      }

      let cancellerWallet = await accountController.getAccountByUserId(
        challenge[canceller]._id
      );
      let otherPlayerWallet = await accountController.getAccountByUserId(
        challenge[otherPlayer]._id
      );
      const { roomCode } = challenge;
      let apiResult = null;
      if (!challenge.apiResult) {
        getRoomResults(roomCode)
          .then((data) => {
            apiResult = data;
          })
          .catch((error) => {
            throw error;
          });
      }

      let challengeObj = {
        ...challenge._doc,
        results: {
          [canceller]: { result: "cancelled", updatedAt: new Date() },

          [otherPlayer]: {
            result: challenge.results[otherPlayer].result,
            updatedAt: challenge.results[otherPlayer].updatedAt,
          },
        },

        cancellationReasons: { [canceller]: req.body.cancellationReason },
      };
      if (apiResult !== null) {
        challengeObj.apiResult = apiResult;
      }
      let data = {
        challengeId: req.params.id,
        userId: challenge[otherPlayer]._id,
        otherPlayer: otherPlayer,
      };

      if (challenge.results[otherPlayer].result == "") {
        handleChallengeUpdate(data);
      }
      if (challenge.results[otherPlayer].result == "lost") {
        challengeObj.state = "hold";
      }
      if (challenge.results[otherPlayer].result == "win") {
        challengeObj.state = "hold";
      }
      if (challenge.results[otherPlayer].result == "cancelled") {
        await handleChallengeCancellation(
          challengeObj,
          challenge,
          canceller,
          otherPlayer,
          cancellerWallet,
          otherPlayerWallet,
          session
        );
      }

      await userController.updateUserByUserId(
        {
          _id: user.id,
          noOfChallenges: 0,
        },
        session
      );
      challenge = await challengesController.updateChallengeById(
        challengeObj,
        session
      );
      await session.commitTransaction();

      return responseHandler(res, 200, challenge, null);
    }
  } catch (error) {
    await session.abortTransaction();

    console.log("error", error);
    return responseHandler(res, 400, null, error.message);
  } finally {
    session.endSession();
  }
}
module.exports = {
  handleWin,
  handleLost,
  handleCancel,
};
