const accountController = require("./controllers/accounts");
const ChallengeModel = require("./models/challenges");
const moment = require("moment");
const challengesController = require("./controllers/challenges");
const userController = require("./controllers/user");
const mongoose = require("mongoose");
async function startGame(data, socket) {
  let response = {
    status: 200,
    data: null,
    error: null,
  };

  try {
    let startChallenge = await challengesController.getChallengeById(
      data.payload.challengeId
    );
    if (startChallenge.state == "requested") {
      let startGameChallenge = await challengesController.updateChallengeById({
        _id: data.payload.challengeId,
        state: "playing",
      });

      var otherplayerId = startChallenge.player._id;

      if (startChallenge) {
        await challengesController.deleteOpenChallengesCreator(
          startChallenge.creator._id
        );
        await challengesController.deleteOpenChallengesCreator(
          startChallenge.player._id
        );
      }

      if (startGameChallenge) {
        var creator33 =
          await userController.increamentNoOfChallengesUserByUserId({
            _id: data.payload.userId,
            hasActiveChallenge: false,
            // Increment noOfChallenges by 1 for creatorUser
          });

        var otherplayer2 =
          await userController.increamentNoOfChallengesUserByUserId({
            _id: otherplayerId,
            hasActiveChallenge: false,
            // Increment noOfChallenges by 1 for otherPlayer
          });

        await challengesController.deleteRequestedChallenges(
          startChallenge.creator._id
        );
        await challengesController.cancelRequestedChallenges(
          startChallenge.creator._id
        );
        await challengesController.deleteRequestedChallenges(
          startChallenge.player._id
        );

        // Check if otherPlayer or creatorUser has noOfChallenges greater than one
        if (creator33.noOfChallenges != 1 || otherplayer2.noOfChallenges != 1) {
          // await challengesController.deleteChallengeById({
          //   _id: data.payload.challengeId,
          // });
          await userController.updateUserByUserId({
            _id: data.payload.userId,
            hasActiveChallenge: false,
            noOfChallenges: 0,
            // Increment noOfChallenges by 1 for creatorUser
          });

          response = {
            ...response,
            status: 400,
            error: "Cannot start the game",
            data: null,
          };
          return socket.send(JSON.stringify(response));
        }
      }

      if (!startGameChallenge) {
        response = {
          ...response,
          status: 400,
          error: "Challenge not found startgame",
          data: null,
        };
        return socket.send(JSON.stringify(response));
      }
      if (creator33.noOfChallenges == 1 && otherplayer2.noOfChallenges == 1) {
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

        return socket.send(JSON.stringify(response));
      }
    } else {
      response = {
        status: 400,
        error: "Challenge not found start",
        data: null,
      };
      return socket.send(JSON.stringify(response));
    }
  } catch (error) {
    response = {
      ...response,
      status: 500,
      error: "Error starting the game",
      data: null,
    };

    return socket.send(JSON.stringify(response));
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
  } finally {
    socket.send(JSON.stringify({ status: 21 }));
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
      if (challenge.state === "playing" && challenge.player._id) {
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
