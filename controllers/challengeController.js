const mongoose = require("mongoose");
const accountHelper = require("../helpers/accountHelper");
const challengeHelper = require("../helpers/challengeHelper");
const { responseHandler } = require("../helpers");

const {
  handleChallengeUpdate,
  handleChallengeCancellation,
} = require("../function");
const userHelper = require("../helpers/userHelper");
const {
  generateHistory,
  getRoomResults,
  commissionDeduction,
  calculateDeduction,
} = require("../helperFunctions/helper");

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
    var challenge = await challengeHelper.getPlayingChallengeById(id);

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
        accountHelper.winningGameAccountUpdate(
          {
            userId: userId,
            wallet: amount,
            winningCash: amount,
            totalWin: deduction,
          },
          session
        ),
        accountHelper.getAccountByUserId(challenge[otherPlayerIs]._id),
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

      const referUser = await userHelper.existingUserById({
        id: challenge[currentUserIs]._id,
      });

      if (referUser.referer) {
        const referralUser = await userHelper.existingUserByReferelId(
          referUser.referer
        );

        if (referralUser) {
          const referralUserWallet = await accountHelper.increaseRefererAccount(
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

    await userHelper.updateUserByUserId(
      {
        _id: userId,
        noOfChallenges: 0,
      },
      session
    );

    challenge.results = updatedResults;
    challenge.winnerScreenShot = updatedWinnerScreenShot;
    challenge = await challengeHelper.updateChallengeById(challenge, session);
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

    var challenge = await challengeHelper.getPlayingChallengeById(id);
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
        accountHelper.winningGameAccountUpdate(
          {
            userId: challenge[otherPlayerIs]._id,
            wallet: amount,
            winningCash: amount,
            totalWin: deduction,
          },
          session
        ),
        accountHelper.getAccountByUserId(challenge[currentUserIs]._id),
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

      const referUser = await userHelper.existingUserById({
        id: challenge[otherPlayerIs]._id,
      });

      if (referUser.referer) {
        const referalAccount = await userHelper.existingUserByReferelId(
          referUser.referer
        );

        if (referalAccount) {
          const updatedReferAccount =
            await accountHelper.increaseRefererAccount(
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

    await userHelper.updateUserByUserId(
      {
        _id: user.id,
        noOfChallenges: 0,
      },
      session
    );

    challenge.results = updatedResults;
    challenge = await challengeHelper.updateChallengeById(challenge, session);

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
    var challenge = await challengeHelper.getPlayingChallengeById(id);
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

    const cancellerWallet = await accountHelper.getAccountByUserId(
      challenge[currentUserIs]._id
    );
    const otherPlayerWallet = await accountHelper.getAccountByUserId(
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

    await userHelper.updateUserByUserId(
      {
        _id: user.id,
        noOfChallenges: 0,
      },
      session
    );

    challenge = await challengeHelper.updateChallengeById(challenge, session);

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
    let challenge = await challengeHelper.getChallengeById(
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
async function otherPlayerLost(
  challenge,
  userWallet,
  winner,
  looser,
  challengeObj,
  session
) {
  challengeObj.state = "resolved";
  let deduction = challenge.amount * 0.03;
  amount = amount * 2 - (amount * 3) / 100;

  const winnWall = await accountHelper.updateAccountByUserId(
    {
      ...userWallet._doc,
      wallet: userWallet.wallet + amount,
      winningCash: userWallet.winningCash + amount,
      totalWin: userWallet.totalWin + challenge.amount - deduction,
    },
    session
  );
  let looserWallet23 = await accountHelper.getAccountByUserId(
    challenge[looser]._id
  );
  const historyObj = {
    userId: challenge[looser]._id,
    historyText: `Lost Against ${challenge[winner].username}`,
    roomCode: challenge.roomCode,
    closingBalance: looserWallet23.wallet,
    amount: Number(challenge.amount),
    type: "lost",
  };
  await generateHistory(historyObj, session);

  const winnerObj = {
    userId: challenge[winner]._id,
    historyText: `Won Against ${challenge[looser].username}`,
    roomCode: challenge.roomCode,
    closingBalance: winnWall.wallet,
    amount: Number(amount),
    type: "won",
  };
  await generateHistory(winnerObj, session);

  let referUser = await userHelper.existingUserById({
    id: challenge[winner]._id,
  });

  if (referUser.referer) {
    let referalAccount = await userHelper.existingUserByReferelId(
      referUser.referer
    );

    const userWall = await accountHelper.increaseRefererAccount(
      {
        userId: referalAccount._id,
        amount: challenge.amount,
      },
      session
    );

    const historyObj = {
      userId: userWall.userId,
      historyText: `referal from ${challenge[winner].username}`,
      roomCode: challenge.roomCode,
      closingBalance: userWall.wallet,
      amount: Number(challenge.amount * 0.02),
      type: "referal",
    };
    await generateHistory(historyObj, session);
  }
}
module.exports = {
  handleWin,
  handleLost,
  handleCancel,
  otherPlayerLost,
  getChallengeByChallengeId,
};
