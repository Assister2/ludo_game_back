const accountController = require("./controllers/accounts");
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
const saveImageToMongoDB = async (imageData) => {
  try {
    const mongoCollectionName = "photos";
    const image = imageData;
    const base64Data = image.replace(/^data:([A-Za-z-+\/]+);base64,/, "");
    const buffer = Buffer.from(base64Data, "base64"); // Convert base64 to buffer

    // const client = new MongoClient(mongoURL, { useUnifiedTopology: true });
    // await client.connect();
    const db = mongoose.connection.db;
    const collection = db.collection(mongoCollectionName);

    // Save the image as a binary object in MongoDB
    const result = await collection.insertOne({ image: buffer });
    console.log("Image saved in MongoDB with ID:", result);
    const savedImage = await collection.findOne({ _id: result.insertedId });
    const imageURL = `https://apibackend.gotiking.com/api/challenges/images/${savedImage._id}`; // Replace with your image URL format

    console.log("Image URL:", imageURL);

    // client.close();

    return imageURL;
  } catch (error) {
    console.log("Error saving image to MongoDB:", error);
    throw error;
  }
};

module.exports = {
  startGame,
  saveImageToMongoDB,
};
