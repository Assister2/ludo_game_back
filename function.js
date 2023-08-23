const accountHelper = require("./helpers/accountHelper");
const ChallengeModel = require("./models/challenges");
const History = require("./models/history");
const { client } = require("./allSocketConnection");
const socketConn = require("./socket");
const challengeHelper = require("./helpers/challengeHelper");
const userHelper = require("./helpers/userHelper");
const { generateHistory } = require("./helperFunctions/helper");

async function startGame(data, socket) {
  let response = {
    status: 200,
    data: null,
    error: null,
  };
  try {
    const startGameChallenge = await challengeHelper.startGameChallenge(
      data.payload.challengeId,
      socket,
      data.payload.userId
    );
    if (startGameChallenge.state === "playing") {
      response = {
        ...response,
        status: 200,
        error: null,
        data: null,
        challengeRedirect: true,
        challengeId: startGameChallenge._id,
      };

      const targetSocketId = await client.get(
        startGameChallenge.player._id.toString()
      );
      const io = socketConn.get();

      if (targetSocketId) {
        const playerSocket = await io.sockets.sockets.get(targetSocketId);
        playerSocket.send(JSON.stringify(response));
      }

      return socket.send(JSON.stringify(response));
    } else {
      response = {
        status: 400,
        error: "Challenge not found start",
        data: null,
      };
      return socket.send(JSON.stringify(response));
    }
  } catch (error) {
    throw error;
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
  challenge,
  currentUserIs,
  otherPlayerIs,
  cancellerWallet,
  otherPlayerWallet,
  session
) => {
  challenge.state = "resolved";

  const updateWalletAndCash = async (
    challenge,
    player,
    playerWallet,
    session
  ) => {
    if (player === "creator") {
      playerWallet = await accountHelper.updateAccountByUserId(
        {
          ...playerWallet._doc,
          wallet: playerWallet.wallet + challenge.amount,
          depositCash:
            playerWallet.depositCash + challenge.creatorChips.depositCash,
          winningCash:
            playerWallet.winningCash + challenge.creatorChips.winningCash,
        },
        session
      );
      const historyObj = {
        userId: challenge.creator._id,
        historyText: `Cancelled Against ${challenge.player.username}`,
        closingBalance: playerWallet.wallet,
        amount: Number(challenge.amount),
        roomCode: challenge.roomCode,
        type: "cancelled",
      };
      await generateHistory(historyObj, session);

      return;
    }
    if (player === "player") {
      playerWallet = await accountHelper.updateAccountByUserId(
        {
          ...playerWallet._doc,
          wallet: playerWallet.wallet + challenge.amount,
          depositCash:
            playerWallet.depositCash + challenge.playerChips.depositCash,
          winningCash:
            playerWallet.winningCash + challenge.playerChips.winningCash,
        },
        session
      );
      const historyObj = {
        userId: challenge.player._id,
        historyText: `Cancelled Against ${challenge.creator.username}`,
        closingBalance: playerWallet.wallet,
        amount: Number(challenge.amount),
        roomCode: challenge.roomCode,
        type: "cancelled",
      };
      await generateHistory(historyObj, session);

      return;
    }

    playerWallet = await accountHelper.updateAccountByUserId(
      {
        ...playerWallet._doc,
        wallet: playerWallet.wallet + challenge.amount,
        depositCash: playerWallet.depositCash + challenge.amount,
      },
      session
    );
  };

  await updateWalletAndCash(challenge, currentUserIs, cancellerWallet, session);

  await updateWalletAndCash(
    challenge,
    otherPlayerIs,
    otherPlayerWallet,
    session
  );
};
const cancelChallenge = async (socket, challengeId, userId) => {
  await challengeHelper.updateChallengeById23(challengeId);
};
const handleChallengeUpdate = async (data) => {
  setTimeout(async () => {
    const challenge = await challengeHelper.getChallengeById12(
      data.challengeId
    );
    if (challenge) {
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

        // await challenge.save();
        await challengeHelper.updatePlayingChallenge(challengeObj);

        await userHelper.updateUserNoSession({
          _id: data.userId,
          playing: false,
          noOfChallenges: 0,
        });
      }
    }
  }, 4 * 60 * 1000); // it should run once only after 4 minutes only
};

const bothResultNotUpdated = async (challengeId) => {
  setTimeout(async () => {
    try {
      let challenge = await challengeHelper.getChallengeById12(challengeId);
      if (challenge) {
        let creatorId = challenge.creator._id;
        let playerId = challenge.player._id;
        if (
          challenge.results.creator.result === "" &&
          challenge.results.player.result === ""
        ) {
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
            await userHelper.updateUserNoSession({
              _id: creatorId,
              playing: false,
              noOfChallenges: 0,
            });
            await userHelper.updateUserNoSession({
              _id: playerId,
              playing: false,
              noOfChallenges: 0,
            });
          }
          // }
        }
      } else {
        return;
      }
    } catch (error) {
      console.log("error", error);

      throw error;
    }
  }, 20 * 60 * 1000); // 20 minutes delay
};

const validateAmount = (amount) => {
  if (amount < 20 || amount > 10000) {
    return false;
  }

  if (amount < 50 && amount % 10 !== 0) {
    return false;
  }

  if (amount >= 50 && amount % 50 !== 0) {
    return false;
  }

  return true;
};

module.exports = {
  startGame,
  validateAmount,
  cancelChallenge,
  bothResultNotUpdated,
  handleChallengeCancellation,
  handleChallengeUpdate,
};
