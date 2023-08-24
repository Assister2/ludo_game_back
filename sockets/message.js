const config = require("../helpers/config");
const mongoose = require("mongoose");
const TelegramBotHandler = require("../telegrambots/telegramBot");
const {
  startGame,
  bothResultNotUpdated,
  validateAmount,
} = require("../helpers/function");
const challengeHelper = require("../helpers/challengeHelper");
const accountHelper = require("../helpers/accountHelper");

let bot = null;

if (config.NODE_ENV === "production") {
  bot = new TelegramBotHandler(config.BOT_TOKEN);
}

const Message = (socket, io) => {
  return socket.on("message", async (message) => {
    const data = JSON.parse(message);
    let buttonEnabled = false;
    switch (data.type) {
      case "create":
        const isValidAmount = validateAmount(data.payload.amount);
        if (!isValidAmount)
          return socket.send(
            JSON.stringify({ status: 400, error: "Invalid amount", data: null })
          );

        let userWallet = await accountHelper.getAccountByUserId(
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

        let challenges = await challengeHelper.getChallengesByUserId(
          data.payload.userId
        );
        if (challenges.length >= 3)
          return socket.send(
            JSON.stringify({
              status: 400,
              error: "You can Set Maximum 3 Challenges at Once",
              data: null,
            })
          );

        const result = challenges.find(
          (challenge) => challenge.amount == data.payload.amount
        );
        if (result)
          return socket.send(
            JSON.stringify({
              status: 400,
              error: "Same Amount Challenge already exist",
              data: null,
            })
          );

        let checkPlayingOrHold = await challengeHelper.checkPlayingOrHold(
          data.payload.userId
        );
        if (!checkPlayingOrHold)
          return socket.send(
            JSON.stringify({
              status: 400,
              error: "Update Your Result In Previous Match First",
              data: null,
            })
          );

        challenge = await challengeHelper.createChallenge({
          creator: data.payload.userId,
          amount: data.payload.amount,
          createdAt: new Date(),
        });
        buttonEnabled = true;
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
            await challengeHelper.getOpenChallengeByChallengeId(
              data.payload.challengeId
            );

          if (!currentChallenge)
            return socket.send(
              JSON.stringify({
                status: 400,
                error: "Request Cancelled",
                data: null,
              })
            );

          let checkRequestedChallenges =
            await challengeHelper.checkAlreadyRequestedGame(
              data.payload.userId
            );

          if (checkRequestedChallenges.length > 0)
            return socket.send(
              JSON.stringify({
                status: 400,
                error: "You have already requested a game",
                data: null,
              })
            );

          let checkPlayingOrHoldGame = await challengeHelper.checkPlayingOrHold(
            data.payload.userId
          );

          if (!checkPlayingOrHoldGame)
            return socket.send(
              JSON.stringify({
                status: 400,
                error: "Update Your Result In Previous Match First",
                data: null,
              })
            );

          currentChallenge = await challengeHelper.updateChallengeById44(
            currentChallenge._id,
            data.payload.userId,
            session
          );

          await session.commitTransaction();
          session.endSession();

          if (!currentChallenge)
            return socket.send(
              JSON.stringify({
                status: 400,
                error: "Challenge not created",
                data: null,
              })
            );

          buttonEnabled = true;
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          throw error;
        }
        break;

      case "cancel":
        await challengeHelper.updateChallengeById23(data.payload.challengeId);
        buttonEnabled = true;

        break;
      case "delete":
        await challengeHelper.updateDeleteChallengeById(
          data.payload.challengeId
        );

        buttonEnabled = true;
        break;

      case "deleteOpenChallengesOfCreator":
        await challengeHelper.deleteOpenChallenges(data.payload.userId);

        break;
      case "startGame":
        await startGame(data, socket);
        buttonEnabled = true;
        await bothResultNotUpdated(data.payload.challengeId);
        break;
    }
    let challenges = await challengeHelper.getAllChallenges();

    if (buttonEnabled) socket.send(JSON.stringify({ status: "enabled" }));
    io.emit("getChallenges", JSON.stringify(challenges));
  });
};

module.exports = Message;
