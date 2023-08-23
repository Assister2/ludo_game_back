const accountController = require("../controllers/accounts");
const challengesController = require("../controllers/challenges");
const config = require("../helpers/config");
const mongoose = require("mongoose");
const TelegramBotHandler = require("../telegrambots/telegramBot");
const {
  startGame,
  bothResultNotUpdated,
  validateAmount,
} = require("../helpers/function");

let bot = null;

if (config.NODE_ENV === "production") {
  bot = new TelegramBotHandler(config.BOT_TOKEN);
}

const playGame = (socket,io) => {
  socket.on("message", async (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case "create":
        const isValidAmount = validateAmount(data.payload.amount);
        if (!isValidAmount) {
          return socket.send(
            JSON.stringify({ status: 400, error: "Invalid amount", data: null })
          );
        }
        const userWallet = await accountController.getAccountByUserId(
          data.payload.userId
        );
        if (userWallet.wallet - data.payload.amount < 0)
          return socket.send(
            JSON.stringify({
              status: 400,
              error: "You dont have enough chips",
              data: null,
            })
          );

        const checkChallenge = await challengesController.checkChallengeLimit(
          data.payload.userId
        );
        if (checkChallenge)
          return socket.send(
            JSON.stringify({
              status: 400,
              error: "You can Set Maximum 3 Challenges at Once",
              data: null,
            })
          );

        let sameAmountChallenge =
          await challengesController.checkSameAmountChallenge({
            userId: data.payload.userId,
            amount: data.payload.amount,
          });
        if (sameAmountChallenge.length > 0)
          return socket.send(
            JSON.stringify({
              status: 400,
              error: "Same Amount Challenge already exist",
              data: null,
            })
          );

        const checkPlayingOrHold =
          await challengesController.checkPlayingOrHold(data.payload.userId);
        if (!checkPlayingOrHold)
          return socket.send(
            JSON.stringify({
              status: 400,
              error: "Update Your Result In Previous Match First",
              data: null,
            })
          );

        let challenge = {
          creator: data.payload.userId,
          amount: data.payload.amount,
          createdAt: new Date(),
        };
        challenge = await challengesController.createChallenge(challenge);
        socket.send(JSON.stringify({ status: "enabled" }));

        if (config.NODE_ENV === "production") {
          const challengeMessage = `${data.payload.username} Set a Challenge\n[Amount] - Rs. ${data.payload.amount}\n\n👇👇👇[Login Now] 👇👇👇\n👉 https://Gotiking.com/ 👈`;
          bot.sendMessageToGroup(config.TELEGRAM_GROUPID, challengeMessage);
        }

        if (!challenge) {
          return socket.send(
            JSON.stringify({
              status: 400,
              error: "challenge not created2",
              data: null,
            })
          );
        }
        break;

      case "play":
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          let currentChallenge =
            await challengesController.getOpenChallengeByChallengeId(
              data.payload.challengeId
            );
          if (!currentChallenge) {
            return socket.send(
              JSON.stringify({
                status: 400,
                error: "Request Cancelled",
                data: null,
              })
            );
          }

          let playerWallet = await accountController.getAccountByUserId(
            data.payload.userId
          );
          if (playerWallet.wallet - currentChallenge.amount < 0) {
            return socket.send(
              JSON.stringify({
                status: 400,
                error: "You don't have enough chips",
                data: null,
              })
            );
          }

          let checkRequestedChallenges =
            await challengesController.checkAlreadyRequestedGame(
              data.payload.userId
            );

          if (checkRequestedChallenges.length > 0) {
            return socket.send(
              JSON.stringify({
                status: 400,
                error: "You have already requested a game",
                data: null,
              })
            );
          }

          let checkPlayingOrHoldGame =
            await challengesController.checkPlayingOrHold(data.payload.userId);

          if (!checkPlayingOrHoldGame) {
            return socket.send(
              JSON.stringify({
                status: 400,
                error: "Update Your Result In Previous Match First",
                data: null,
              })
            );
          }

          currentChallenge = await challengesController.updateChallengeById44(
            currentChallenge._id,
            data.payload.userId,
            session
          );

          await session.commitTransaction();
          session.endSession();

          let challenges = await challengesController.getAllChallenges();
          socket.send(JSON.stringify(challenges));

          if (!currentChallenge) {
            return socket.send(
              JSON.stringify({
                status: 400,
                error: "Challenge not created",
                data: null,
              })
            );
          }

          socket.send(JSON.stringify({ status: "enabled" }));
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          throw error;
        }
        break;
      case "cancel":
        await challengesController.updateChallengeById23(
          data.payload.challengeId
        );
        socket.send(JSON.stringify({ status: "enabled" }));
        break;

      case "delete":
        await challengesController.updateDeleteChallengeById(
          data.payload.challengeId
        );
        socket.send(JSON.stringify({ status: "enabled" }));
        break;

      case "deleteOpenChallengesOfCreator":
        await challengesController.deleteOpenChallenges(data.payload.userId);
        break;

      case "startGame":
        await startGame(data, socket);
        socket.send(JSON.stringify({ status: "enabled" }));
        await bothResultNotUpdated(data.payload.challengeId);
        break;
    }
    let challenges = await challengesController.getAllChallenges();
    socket.send(JSON.stringify(challenges));
  });
};

module.exports = playGame;
