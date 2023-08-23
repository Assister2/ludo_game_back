const mongoose = require("mongoose");
const accountController = require("../../controllers/accounts");
const challengesController = require("../../controllers/challenges");
const { responseHandler } = require("../../helpers");

const {
  handleChallengeUpdate,
  handleChallengeCancellation,
} = require("../../helpers/function");
const userController = require("../../controllers/user");
const {
  generateHistory,
  getRoomResults,
  commissionDeduction,
  calculateDeduction,
} = require("../../helperFunctions/helper");
const { otherPlyerLost } = require("../challengeConditions");

async function handleWin(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { image } = req.body;

  if (!id || !image) {
    return responseHandler(res, 400, null, "Fields are missing");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    var challenge = await challengesController.getPlayingChallengeById(id);

    if (!challenge) {
      return responseHandler(res, 400, null, "result already updated");
    }

    const user = req.user;
    const currentUserIs =
      user.id == challenge.creator._id ? "creator" : "player";
    const otherPlayerIs =
      user.id != challenge.creator._id ? "creator" : "player";

    if (challenge.results[currentUserIs].result) {
      return responseHandler(
        res,
        400,
        null,
        "You have already submitted the result"
      );
    }

    const amount = commissionDeduction(challenge.amount);
    const { roomCode } = challenge;

    let apiResult = null;
    if (!challenge.apiResult) {
      apiResult = await getRoomResults(roomCode);
    }

    const updatedResults = {
      [currentUserIs]: { result: "win", updatedAt: new Date() },
      [otherPlayerIs]: {
        result: challenge.results[otherPlayerIs].result,
        updatedAt: challenge.results[otherPlayerIs].updatedAt,
      },
    };

    const updatedWinnerScreenShot = {
      [currentUserIs]: image,
      [otherPlayerIs]: challenge.winnerScreenShot[otherPlayerIs],
    };

    if (apiResult !== null) {
      challenge.apiResult = apiResult;
    }

    if (
      challenge.results[otherPlayerIs].result === "win" ||
      challenge.results[otherPlayerIs].result === "cancelled"
    ) {
      challenge.state = "hold";
    }

    if (challenge.results[otherPlayerIs].result === "") {
      const data = {
        challengeId: id,
        userId: challenge[otherPlayerIs]._id,
        otherPlayer: otherPlayerIs,
      };
      await handleChallengeUpdate(data);
    }

    if (challenge.results[otherPlayerIs].result === "lost") {
      challenge.state = "resolved";

      const deduction = calculateDeduction(challenge.amount);

      const [winnerUpdatedAccount, looserWallet] = await Promise.all([
        accountController.winningGameAccountUpdate(
          {
            userId: userId,
            wallet: amount,
            winningCash: amount,
            totalWin: deduction,
          },
          session
        ),
        accountController.getAccountByUserId(challenge[otherPlayerIs]._id),
      ]);
      const historyObjects = [
        {
          userId: challenge[otherPlayerIs]._id,
          historyText: `Lost Against ${challenge[currentUserIs].username}`,
          roomCode: challenge.roomCode,
          closingBalance: looserWallet.wallet,
          amount: Number(challenge.amount),
          type: "lost",
        },
        {
          userId: challenge[currentUserIs]._id,
          historyText: `Won Against ${challenge[otherPlayerIs].username}`,
          roomCode: challenge.roomCode,
          closingBalance: winnerUpdatedAccount.wallet,
          amount: Number(amount),
          type: "won",
        },
      ];

      const referUser = await userController.existingUserById({
        id: challenge[currentUserIs]._id,
      });

      if (referUser.referer) {
        const referralUser = await userController.existingUserByReferelId(
          referUser.referer
        );

        if (referralUser) {
          const referralUserWallet =
            await accountController.increaseRefererAccount(
              {
                userId: referralUser._id,
                amount: challenge.amount,
              },
              session
            );

          historyObjects.push({
            userId: referralUserWallet.userId,
            historyText: `Referral from ${challenge[currentUserIs].username}`,
            roomCode: challenge.roomCode,
            closingBalance: referralUserWallet.wallet,
            amount: Number(challenge.amount * 0.02),
            type: "referral",
          });
        }
      }

      await Promise.all(
        historyObjects.map((history) => generateHistory(history, session))
      );
    }

    await userController.updateUserByUserId(
      {
        _id: userId,
        noOfChallenges: 0,
      },
      session
    );

    challenge.results = updatedResults;
    challenge.winnerScreenShot = updatedWinnerScreenShot;
    challenge = await challengesController.updateChallengeById(
      challenge,
      session
    );
    console.log("final challenge: ", challenge);

    await session.commitTransaction();
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

  try {
    session.startTransaction();

    const { id } = req.params;
    if (!id) {
      return responseHandler(res, 400, null, "Fields are missing");
    }

    var challenge = await challengesController.getPlayingChallengeById(id);
    if (!challenge) {
      return responseHandler(res, 400, null, "result already updated");
    }

    const user = req.user;
    const currentUserIs =
      user.id == challenge.creator._id ? "creator" : "player";
    const otherPlayerIs =
      user.id != challenge.creator._id ? "creator" : "player";
    if (challenge.results[currentUserIs].result) {
      return responseHandler(
        res,
        400,
        null,
        "You have already submitted the result"
      );
    }

    const amount = commissionDeduction(challenge.amount);
    const { roomCode } = challenge;

    const apiResult = !challenge.apiResult
      ? await getRoomResults(roomCode)
      : null;

    const updatedResults = {
      [currentUserIs]: { result: "lost", updatedAt: new Date() },
      [otherPlayerIs]: {
        result: challenge.results[otherPlayerIs].result,
        updatedAt: challenge.results[otherPlayerIs].updatedAt,
      },
    };

    if (apiResult !== null) {
      challenge.apiResult = apiResult;
    }

    if (challenge.results[otherPlayerIs].result === "") {
      const data = {
        challengeId: id,
        userId: challenge[otherPlayerIs]._id,
        otherPlayer: otherPlayerIs,
      };
      await handleChallengeUpdate(data);
    }

    if (
      challenge.results[otherPlayerIs].result === "cancelled" ||
      challenge.results[otherPlayerIs].result === "lost"
    ) {
      challenge.state = "hold";
    }

    if (challenge.results[otherPlayerIs].result === "win") {
      challenge.state = "resolved";
      const deduction = calculateDeduction(challenge.amount);

      const [updatedUserWallet, looserWallet] = await Promise.all([
        accountController.winningGameAccountUpdate(
          {
            userId: challenge[otherPlayerIs]._id,
            wallet: amount,
            winningCash: amount,
            totalWin: deduction,
          },
          session
        ),
        accountController.getAccountByUserId(challenge[currentUserIs]._id),
      ]);

      const historyObjects = [
        {
          userId: challenge[currentUserIs]._id,
          historyText: `Lost Against ${challenge[otherPlayerIs].username}`,
          roomCode: challenge.roomCode,
          closingBalance: looserWallet.wallet,
          amount: Number(amount),
          type: "lost",
        },
        {
          userId: challenge[otherPlayerIs]._id,
          historyText: `Won Against ${challenge[currentUserIs].username}`,
          roomCode: challenge.roomCode,
          closingBalance: updatedUserWallet.wallet,
          amount: Number(amount),
          type: "won",
        },
      ];

      await Promise.all(
        historyObjects.map((history) => generateHistory(history, session))
      );

      const referUser = await userController.existingUserById({
        id: challenge[otherPlayerIs]._id,
      });

      if (referUser.referer) {
        const referalAccount = await userController.existingUserByReferelId(
          referUser.referer
        );

        if (referalAccount) {
          const updatedReferAccount =
            await accountController.increaseRefererAccount(
              {
                userId: referalAccount._id,
                amount: challenge.amount,
              },
              session
            );

          const referralHistory = {
            userId: updatedReferAccount.userId,
            historyText: `Referral from ${challenge[otherPlayerIs].username}`,
            roomCode: challenge.roomCode,
            closingBalance: updatedReferAccount.wallet,
            amount: Number(challenge.amount * 0.02),
            type: "referral",
          };
          await generateHistory(referralHistory, session);
        }
      }
    }

    await userController.updateUserByUserId(
      {
        _id: user.id,
        noOfChallenges: 0,
      },
      session
    );

    challenge.results = updatedResults;
    challenge = await challengesController.updateChallengeById(
      challenge,
      session
    );

    await session.commitTransaction();
    return responseHandler(res, 200, challenge, null);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

async function handleCancel(req, res) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { id } = req.params;
    var challenge = await challengesController.getPlayingChallengeById(id);
    if (!challenge) {
      return responseHandler(res, 400, null, "result already updated");
    }

    const user = req.user;
    const currentUserIs =
      user.id == challenge.creator._id ? "creator" : "player";
    const otherPlayerIs =
      user.id != challenge.creator._id ? "creator" : "player";
    if (challenge.results[currentUserIs].result) {
      return responseHandler(res, 400, null, "result already updatedd");
    }

    const cancellerWallet = await accountController.getAccountByUserId(
      challenge[currentUserIs]._id
    );
    const otherPlayerWallet = await accountController.getAccountByUserId(
      challenge[otherPlayerIs]._id
    );

    const { roomCode } = challenge;
    let apiResult = null;
    if (!challenge.apiResult) {
      apiResult = await getRoomResults(roomCode);
    }

    challenge.results = {
      [currentUserIs]: { result: "cancelled", updatedAt: new Date() },
      [otherPlayerIs]: {
        result: challenge.results[otherPlayerIs].result,
        updatedAt: challenge.results[otherPlayerIs].updatedAt,
      },
    };

    challenge.cancellationReasons = {
      [currentUserIs]: req.body.cancellationReason,
    };

    if (apiResult !== null) {
      challenge.apiResult = apiResult;
    }

    if (challenge.results[otherPlayerIs].result === "") {
      const data = {
        challengeId: id,
        userId: challenge[otherPlayerIs]._id,
        otherPlayer: otherPlayerIs,
      };
      await handleChallengeUpdate(data);
    }

    if (
      challenge.results[otherPlayerIs].result === "lost" ||
      challenge.results[otherPlayerIs].result === "win"
    ) {
      challenge.state = "hold";
    }

    if (challenge.results[otherPlayerIs].result === "cancelled") {
      await handleChallengeCancellation(
        challenge,
        currentUserIs,
        otherPlayerIs,
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
      challenge,
      session
    );

    await session.commitTransaction();
    return responseHandler(res, 200, challenge, null);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

async function getChallengeByChallengeId(req, res) {
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

module.exports = {
  handleWin,
  handleLost,
  handleCancel,
  getChallengeByChallengeId,
};
