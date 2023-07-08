const accountController = require("./controllers/accounts");
const ChallengeModel = require("./models/challenges");
const moment = require("moment");

const challengesController = require("./controllers/challenges");
const userController = require("./controllers/user");

async function startGame(data, socket) {
  let response = {
    status: 200,
    data: null,
    error: null,
  };
  try {
    // let startChallenge = await challengesController.getChallengeById(
    //   data.payload.challengeId
    // );
    const startGameChallenge = await challengesController.dataBaseUpdate(
      data.payload.challengeId
    );
    if (startGameChallenge.state == "playing") {
      // if (!startGameChallenge) {
      //   response = {
      //     ...response,
      //     status: 400,
      //     error: "Challenge not found startgame",
      //     data: null,
      //   };
      //   return socket.send(JSON.stringify(response));
      // }
      if (startGameChallenge) {
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
const cancelChallenge = async (socket, challengeId, userId) => {
  try {
    await challengesController.updateChallengeById23(challengeId);
    return socket.send(JSON.stringify({ status: 21 }));
  } catch (error) {
    console.log("cancelled", error);
  } finally {
    socket.send(JSON.stringify({ status: 21 }));
  }
};
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
