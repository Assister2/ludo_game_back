const accountController = require("./controllers/accounts");
const challengesController = require("./controllers/challenges");
const userController = require("./controllers/user");
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

const saveImageToMongoDB = async (imageData, filetype) => {
  try {
    // Create a new Binary object with the image data
    const imageBuffer = Buffer.from(imageData, "base64");
    const image = new Image({
      imageData: imageBuffer,
      filetype: filetype,
    });
    const result = await image.save();

    // Save the image as a binary object in MongoDB
    // const result = await Image.insertOne({ image: imageBuffer })
    //   .then()
    //   .catch((err) => {
    //     console.log("inserterror", err);
    //   });
    console.log("resssss", result.insertedId);
    console.log("resssss22", result._id);
    console.log("inserteddd", result.insertedId);
    const savedImage = result._id;
    const imageURL = `https://apibackend.gotiking.com/api/challenges/images/${savedImage}`; // Replace with your image URL format

    console.log("Image URL:", imageURL);

    return imageURL;
  } catch (error) {
    console.log("Error saving image to MongoDB:", error);
    throw error;
  }
};
const handleChallengeCancellation = async (
  challengeObj,
  challenge,
  canceller,
  otherPlayer,
  cancellerWallet,
  otherPlayerWallet
) => {
  if (
    (canceller == "creator" &&
      challenge.creatorChips != null &&
      challenge.creatorChips.depositCash > 0) ||
    challenge.creatorChips.winningCash > 0
  ) {
    console.log("cccc2");
    cancellerWallet = await accountController.updateAccountByUserId({
      ...cancellerWallet._doc,
      wallet: cancellerWallet.wallet + challenge.amount,
      depositCash:
        cancellerWallet.depositCash + challenge.creatorChips.depositCash,
      winningCash:
        cancellerWallet.winningCash + challenge.creatorChips.winningCash,
    });
  } else if (
    (canceller == "player" &&
      challenge.playerChips != null &&
      challenge.playerChips.depositCash > 0) ||
    challenge.playerChips.winningCash > 0
  ) {
    console.log("cccc3");
    otherPlayerWallet = await accountController.updateAccountByUserId({
      ...otherPlayerWallet._doc,
      wallet: otherPlayerWallet.wallet + challenge.amount,
      depositCash:
        otherPlayerWallet.depositCash + challenge.playerChips.depositCash,
      winningCash:
        otherPlayerWallet.winningCash + challenge.playerChips.winningCash,
    });
  } else {
    console.log("cccc4");
    cancellerWallet = await accountController.updateAccountByUserId({
      ...cancellerWallet._doc,
      wallet: cancellerWallet.wallet + challenge.amount,
      depositCash: cancellerWallet.depositCash + challenge.amount,
    });
  }

  if (
    (otherPlayer == "creator" &&
      challenge.creatorChips != null &&
      challenge.creatorChips.depositCash > 0) ||
    challenge.creatorChips.winningCash > 0
  ) {
    console.log("cccc5");
    otherPlayerWallet = await accountController.updateAccountByUserId({
      ...otherPlayerWallet._doc,
      wallet: otherPlayerWallet.wallet + challenge.amount,
      depositCash:
        otherPlayerWallet.depositCash + challenge.creatorChips.depositCash,
      winningCash:
        otherPlayerWallet.winningCash + challenge.creatorChips.winningCash,
    });
  } else if (
    (otherPlayer == "player" &&
      challenge.playerChips != null &&
      challenge.playerChips.depositCash > 0) ||
    challenge.playerChips.winningCash > 0
  ) {
    console.log("cccc6");
    otherPlayerWallet = await accountController.updateAccountByUserId({
      ...otherPlayerWallet._doc,
      wallet: otherPlayerWallet.wallet + challenge.amount,
      depositCash:
        otherPlayerWallet.depositCash + challenge.playerChips.depositCash,
      winningCash:
        otherPlayerWallet.winningCash + challenge.playerChips.winningCash,
    });
  } else {
    console.log("cccc7");
    otherPlayerWallet = await accountController.updateAccountByUserId({
      ...otherPlayerWallet._doc,
      wallet: otherPlayerWallet.wallet + challenge.amount,
      depositCash: otherPlayerWallet.depositCash + challenge.amount,
    });
  }

  // await accountController.updateAccountByUserId({
  //   ...otherPlayerWallet._doc,
  //   wallet: otherPlayerWallet.wallet + challenge.amount,
  //   depositCash: otherPlayerWallet.depositCash + challenge.amount,
  // });
  console.log("otherPlayerWallet", otherPlayerWallet);
};

module.exports = {
  startGame,
  saveImageToMongoDB,
  handleChallengeCancellation,
};
