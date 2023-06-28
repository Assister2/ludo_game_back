const accountController = require("./controllers/accounts");
const ChallengeModel = require("./models/challenges");
const moment = require("moment");
const challengesController = require("./controllers/challenges");
const userController = require("./controllers/user");
const mongoose = require("mongoose");
async function startGame(data, socket) {
  const session = await mongoose.startSession();
  session.startTransaction();
  let response = {
    status: 200,
    data: null,
    error: null,
  };

  try {
    let startChallenge = await challengesController.getChallengeById(
      data.payload.challengeId
    );
    if (startChallenge.state == "requested" && startChallenge.player) {
      let startGameChallenge = await challengesController.updateChallengeById22(
        data.payload.challengeId
      );
      if (startGameChallenge.state === "playing") {
        console.log("start");
        await challengesController.deleteOpenChallengesCreator(
          startChallenge.creator._id
        );
        await challengesController.deleteOpenChallengesCreator(
          startChallenge.player._id
        );
        await challengesController.cancelRequestedChallenges(
          startChallenge.creator._id
        );
        await challengesController.cancelRequestedChallenges(
          startChallenge.player._id
        );
        var noOfChallengesCreator =
          await userController.increamentNoOfChallengesUserByUserId({
            _id: data.payload.userId,
            hasActiveChallenge: false,
            noOfChallenges: 1,
          });
        var noOfChallengesPlayer =
          await userController.increamentNoOfChallengesUserByUserId({
            _id: startChallenge.player._id,
            hasActiveChallenge: false,
            noOfChallenges: 1,
          });
        console.log(
          "ccc",
          noOfChallengesCreator.noOfChallenges,
          noOfChallengesPlayer.noOfChallenges
        );

        if (
          noOfChallengesCreator.noOfChallenges == 1 &&
          noOfChallengesPlayer.noOfChallenges == 1
        ) {
          await accountController.decreasePlayersAccount(startChallenge);

          response = {
            ...response,
            status: 200,
            error: null,
            data: null,
            challengeRedirect: true,
            challengeId: startGameChallenge._id,
          };
          socket.send(JSON.stringify({ status: 3 }));
          await session.commitTransaction();
          session.endSession();
          console.log("endd");
          socket.send(JSON.stringify({ status: 22 }));

          return socket.send(JSON.stringify(response));
        }
      }
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
  } finally {
    socket.send(JSON.stringify({ status: 22 }));
  }
}

const handleChallengeCancellation = async (
  challengeObj,
  challenge,
  canceller,
  otherPlayer,
  cancellerWallet,
  otherPlayerWallet
) => {
  challengeObj.state = "resolved";
  // const session = (await startSession()).startTransaction();
  const updateWalletAndCash = async (challenge, player, playerWallet) => {
    if (player === "creator") {
      playerWallet = await accountController.updateAccountByUserId({
        ...playerWallet._doc,
        wallet: playerWallet.wallet + challenge.amount,
        depositCash:
          playerWallet.depositCash + challenge.creatorChips.depositCash,
        winningCash:
          playerWallet.winningCash + challenge.creatorChips.winningCash,
      });
      return;
    }
    if (player === "player") {
      playerWallet = await accountController.updateAccountByUserId({
        ...playerWallet._doc,
        wallet: playerWallet.wallet + challenge.amount,
        depositCash:
          playerWallet.depositCash + challenge.playerChips.depositCash,
        winningCash:
          playerWallet.winningCash + challenge.playerChips.winningCash,
      });
      return;
    }

    playerWallet = await accountController.updateAccountByUserId({
      ...playerWallet._doc,
      wallet: playerWallet.wallet + challenge.amount,
      depositCash: playerWallet.depositCash + challenge.amount,
    });
  };

  await updateWalletAndCash(challenge, canceller, cancellerWallet);

  await updateWalletAndCash(challenge, otherPlayer, otherPlayerWallet);
};
async function cancelChallenge(socket, challengeId, userId) {
  try {
    const getChallenge = await challengesController.getChallengeById(
      challengeId
    );
    if (getChallenge.state === "requested") {
      const cancelledChallenge =
        await challengesController.updateChallengeById23(challengeId);

      if (cancelledChallenge) {
        return socket.send(JSON.stringify({ status: 21 }));
      }
    }
  } catch (error) {
    console.log("cancelled", error);
    await session.abortTransaction();
    session.endSession();
  }
}
const handleChallengeUpdate = async (data) => {
  setTimeout(async () => {
    const challenge = await challengesController.getChallengeById(
      data.challengeId
    );

    if (challenge.results[data.otherPlayer].result === "") {
      const challengeObj = {
        ...challenge._doc,
        results: {
          ...challenge.results,
          [data.otherPlayer]: {
            result: "",
            timeover: true,
            updatedAt: new Date(),
          },
        },
        state: "hold",
      };

      await challenge.save();
      await challengesController.updateChallengeById(challengeObj);

      await userController.updateUserByUserId({
        _id: data.userId,
        playing: false,
        noOfChallenges: 0,
      });
    }
  }, 1 * 30 * 1000); // 10 minutes delay
};

const bothResultNotUpdated = async (challengeId) => {
  setTimeout(async () => {
    try {
      let challenge = await challengesController.getChallengeById(challengeId);
      console.log("timerChallenge", challenge);
      let creatorId = challenge.creator._id;
      let playerId = challenge.player._id;

      // Iterate through the challenges
      if (
        challenge.results.creator.result === "" &&
        challenge.results.player.result === ""
      ) {
        const createdAt = moment(challenge.createdAt); // Convert the createdAt value to a moment object or use any other date manipulation library

        // Compare the createdAt time with the current time
        const minutesPassed = moment().diff(createdAt, "minutes");

        if (minutesPassed > 1) {
          // Challenge was created more than 3 minutes ago, perform update
          const updated = await ChallengeModel.findByIdAndUpdate(
            challenge._id,
            {
              results: {
                ...challenge.results,
                creator: {
                  result: "",
                  timeover: true,
                  updatedAt: new Date(),
                },
                player: {
                  result: "",
                  timeover: true,
                  updatedAt: new Date(),
                },
              },
              state: "hold",
            }
          );

          if (updated) {
            await userController.updateUserByUserId({
              _id: creatorId,
              playing: false,
              noOfChallenges: 0,
            });
            await userController.updateUserByUserId({
              _id: playerId,
              playing: false,
              noOfChallenges: 0,
            });
          }
        }
      }
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  }, 6 * 60 * 1000); // 10 minutes delay
};

module.exports = {
  startGame,
  cancelChallenge,
  bothResultNotUpdated,
  handleChallengeCancellation,
  handleChallengeUpdate,
};
