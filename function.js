const accountController = require("./controllers/accounts");
const challengesController = require("./controllers/challenges");
const userController = require("./controllers/user");
const History = require("./models/history");
const Image = require("./models/image");
const mongoose = require("mongoose");
const { Binary } = require("mongodb");
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
    var otherplayerId = startChallenge.player._id;
    // let otherPlayer = await userController.existingUserById({
    //   id: otherplayerId,
    // });
    // let creatorUser = await userController.existingUserById({
    //   id: data.payload.userId,
    // });

    if (startChallenge) {
      await challengesController.deleteOpenChallengesCreator(
        startChallenge.creator._id
      );
      await challengesController.deleteOpenChallengesCreator(
        startChallenge.player._id
      );
    }

    let startGameChallenge = await challengesController.updateChallengeById({
      _id: data.payload.challengeId,
      state: "playing",
    });

    if (startGameChallenge) {
      var creator33 = await userController.increamentNoOfChallengesUserByUserId(
        {
          _id: data.payload.userId,
          hasActiveChallenge: false,
          // Increment noOfChallenges by 1 for creatorUser
        }
      );

      var otherplayer2 =
        await userController.increamentNoOfChallengesUserByUserId({
          _id: otherplayerId,
          hasActiveChallenge: false,
          // Increment noOfChallenges by 1 for otherPlayer
        });
      // console.log("creato33", creator33);
      // console.log("otherplayer2", otherplayer2);
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
        await challengesController.deleteChallengeById({
          _id: data.payload.challengeId,
        });
        await userController.updateUserByUserId({
          _id: data.payload.userId,
          hasActiveChallenge: false,
          noOfChallenges: 0,
          // Increment noOfChallenges by 1 for creatorUser
        });
        // await userController.updateUserByUserId({
        //   _id: otherplayerId,
        //   hasActiveChallenge: false,
        //   noOfChallenges: 0,
        //   // Increment noOfChallenges by 1 for creatorUser
        // });
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
        error: "Challenge not found",
        data: null,
      };
      return socket.send(JSON.stringify(response));
    }
    if (creator33.noOfChallenges == 1 && otherplayer2.noOfChallenges == 1) {
      await accountController.decreasePlayersAccount(startChallenge);

      console.log(
        "workingg",
        creator33.noOfChallenges,
        otherplayer2.noOfChallenges
      );
      response = {
        ...response,
        status: 200,
        error: null,
        data: null,
        challengeRedirect: true,
        challengeId: startGameChallenge._id,
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

  const updateWalletAndCash = async (challenge, player, playerWallet) => {
    if (player === "creator") {
      console.log("cccc2", playerWallet);
      console.log("cccc21", challenge.creatorChips);
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
      console.log("cccc3", playerWallet);
      console.log("cccc31", challenge.playerChips);
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
    console.log("cccc4", typeof playerWallet.depositCash);
    playerWallet = await accountController.updateAccountByUserId({
      ...playerWallet._doc,
      wallet: playerWallet.wallet + challenge.amount,
      depositCash: playerWallet.depositCash + challenge.amount,
    });
  };
  console.log("forcanceller", typeof canceller, canceller);
  await updateWalletAndCash(challenge, canceller, cancellerWallet);
  console.log("forotherPlayer", typeof otherPlayer, otherPlayer);
  await updateWalletAndCash(challenge, otherPlayer, otherPlayerWallet);

  console.log("otherPlayerWallet", otherPlayerWallet);
};

module.exports = {
  startGame,
 
  handleChallengeCancellation,
};
