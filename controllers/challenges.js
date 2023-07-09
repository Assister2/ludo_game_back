const ChallengeModel = require("../models/challenges");
const User = require("../models/user");
const Account = require("../models/accounts");
const mongoose = require("mongoose");
const axios = require("axios");

const moment = require("moment");
const challengesController = {
  /**
   * createChallenge - challengeObject that need to be insert.
   * @param challengeObject - challengeObject that need to insert
   * @returns {Promise<void>}
   */
  createChallenge: async (challengeObject) => {
    try {
      let challenge = new ChallengeModel(challengeObject);
      await challenge.save();
      return challenge;
    } catch (error) {
      throw error;
    }
  },
  /**
   * getAllChallenges - to get all challenges
   * @returns {Promise<void>}
   */
  cancelRequestedChallengesByPlayerId: async (playerId) => {
    try {
      let challenge = await ChallengeModel.updateMany(
        { player: playerId, state: "requested" },
        { $set: { state: "open", player: null } },
        { new: true }
      );
      return challenge;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },

  /**
     * 
     * 

            /**
 * deleteOpenChallengesCreator - to get all challenges
 * @returns {Promise<void>}
 */
  deleteOpenChallengesCreator: async (creatorId, playerId) => {
    try {
      let challenge = await ChallengeModel.updateMany(
        { creator: creatorId, state: "open" },
        { $set: { status: 0 } },
        { new: true }
      );
      return challenge;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },
  dataBaseUpdate: async (challengeId) => {
    try {
      let updatedChallenge = await ChallengeModel.findOneAndUpdate(
        { _id: challengeId, state: "requested" },
        { $set: { state: "playing" } },
        { new: true }
      );
      if (updatedChallenge) {
        await ChallengeModel.updateMany(
          {
            creator: updatedChallenge.creator._id,
            state: { $in: ["open", "requested"] },
          },
          { $set: { status: 0 } },
          { new: true }
        );
        await ChallengeModel.updateMany(
          {
            creator: updatedChallenge.player._id,
            state: { $in: ["open", "requested"] },
          },
          { $set: { status: 0 } },
          { new: true }
        );
        await ChallengeModel.updateMany(
          { player: updatedChallenge.creator._id, state: "requested" },
          { $set: { state: "open", player: null } },
          { new: true }
        );
        await ChallengeModel.updateMany(
          { player: updatedChallenge.player._id, state: "requested" },
          { $set: { state: "open", player: null } },
          { new: true }
        );
        const creator = await User.findOneAndUpdate(
          { _id: updatedChallenge.creator._id, noOfChallenges: 0 },
          { $set: { noOfChallenges: 1 } },
          { new: true }
        );
        const player = await User.findOneAndUpdate(
          { _id: updatedChallenge.player._id, noOfChallenges: 0 },
          { $set: { noOfChallenges: 1 } },
          { new: true }
        );

        //decrease accounts of users
        console.log(
          "creatorrandplayer",
          creator.noOfChallenges,
          player.noOfChallenges
        );

        let creatorChips = { winningCash: 0, depositCash: 0 };
        let playerChips = { winningCash: 0, depositCash: 0 };
        var config = {
          method: "get",
          url: "  http://128.199.28.12:3000/ludoking/roomcode",
          // url: "http://43.205.124.118/ludoking/roomcode/",
          headers: {},
        };
        let roomCodeResponse = await axios(config);
        const roomCode = roomCodeResponse.data;
        updatedChallenge = await ChallengeModel.findOneAndUpdate(
          { _id: challengeId, state: "playing" },
          { $set: { roomCode: roomCode } },
          { new: true }
        );

        let playerAccount = await Account.findOne({
          userId: updatedChallenge.player._id,
        });
        let creatorAccount = await Account.findOne({
          userId: updatedChallenge.creator._id,
        });
        if (playerAccount.depositCash >= updatedChallenge.amount) {
          playerAccount.depositCash -= updatedChallenge.amount;
          playerAccount.wallet -= updatedChallenge.amount;
          playerChips.depositCash = updatedChallenge.amount;
        } else if (playerAccount.depositCash < updatedChallenge.amount) {
          const remaining = updatedChallenge.amount - playerAccount.depositCash;
          if (playerAccount.winningCash < remaining) {
            throw new Error("Insufficient balance for Player");
          } else {
            playerChips = {
              depositCash: playerAccount.depositCash,
              winningCash: remaining,
            };
            playerAccount.depositCash = 0;
            playerAccount.winningCash -= remaining;
            playerAccount.wallet -= updatedChallenge.amount;
          }
        }

        if (creatorAccount.depositCash >= updatedChallenge.amount) {
          creatorAccount.depositCash -= updatedChallenge.amount;
          creatorAccount.wallet -= updatedChallenge.amount;
          creatorChips.depositCash = updatedChallenge.amount;
        } else if (creatorAccount.depositCash < updatedChallenge.amount) {
          const remaining =
            updatedChallenge.amount - creatorAccount.depositCash;

          if (creatorAccount.winningCash < remaining) {
            throw new Error("Insufficient balance for creator");
          } else {
            creatorChips = {
              depositCash: creatorAccount.depositCash,
              winningCash: remaining,
            };
            creatorAccount.depositCash = 0;
            creatorAccount.winningCash -= remaining;
            creatorAccount.wallet -= updatedChallenge.amount;
          }
        }

        await Account.findOneAndUpdate(
          { userId: creatorAccount.userId },
          { $set: creatorAccount },
          { new: true }
        );

        await Account.findOneAndUpdate(
          { userId: playerAccount.userId },
          { $set: playerAccount },
          { new: true }
        );
        if (playerChips != null || creatorChips != null) {
          await challengesController.updateChallengeById({
            _id: updatedChallenge._id,
            creatorChips: creatorChips,
            playerChips: playerChips,
          });
        }

        return updatedChallenge;
      } else {
        return false;
      }
    } catch (error) {
      console.log("error2323", error);
      throw error;
    }
  },

  /**
   * deleteRequestedChallenges - to get all challenges
   * @returns {Promise<void>}
   */
  deleteRequestedChallenges: async (creatorId) => {
    try {
      let challenge = await ChallengeModel.updateMany(
        { creator: creatorId, state: "requested" },
        { $set: { status: 0 } },
        { new: true }
      );
      return challenge;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },

  /**
   *
   *                 /**
   * deleteRequestedChallenges - to get all challenges
   * @returns {Promise<void>}
   */
  deleteOpenChallenges: async (creatorId) => {
    try {
      let challenge = await ChallengeModel.deleteMany({
        creator: creatorId,
        state: { $in: ["open", "requested"] },
      });
      await ChallengeModel.updateMany(
        { player: creatorId, state: "requested" },
        { $set: { state: "open", player: null } },
        { new: true }
      );
      return challenge;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },
  cancelRequestedChallenges2: async (creatorId) => {
    try {
      let challenge = await ChallengeModel.updateMany(
        { creator: creatorId, state: "requested" },
        { $set: { state: "open", player: null } },
        { new: true }
      );
      return challenge;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },

  /**
   * getAllChallenges - to get all challenges
   * @returns {Promise<void>}
   */
  getAllChallenges: async (challengeObject) => {
    try {
      let challenge = await ChallengeModel.find({
        status: 1,
        state: { $nin: ["resolved"] },
      }).populate("creator player", "username profileImage");
      return challenge;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },
  UpdateOpenChallenges: async () => {
    try {
      const challenges = await ChallengeModel.find({
        status: 1,
        state: "open",
      });
      challenges;

      let updatedCount = 0;
      if (challenges.length > 0) {
        // Iterate through the challenges
        for (const challenge of challenges) {
          const createdAt = moment(challenge.createdAt); // Convert the createdAt value to a moment object or use any other date manipulation library

          // Compare the createdAt time with the current time
          const minutesPassed = moment().diff(createdAt, "minutes");

          if (minutesPassed > 1) {
            // Challenge was created more than 3 minutes ago, perform update
            await ChallengeModel.findByIdAndUpdate(challenge._id, {
              status: 0,
            });
            updatedCount++;
          }
        }
        console.log(`Updated ${updatedCount} challenges.`);
      }
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },

  /**
   * updateChallengeById - updateChallengeById
   * @returns {Promise<void>}
   */
  updateChallengeById: async (challengeObj) => {
    try {
      let challenge = await ChallengeModel.findOneAndUpdate(
        { _id: challengeObj._id },
        { $set: challengeObj },
        { new: true }
      );
      return challenge;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },
  updateDeleteChallengeById: async (challengeId) => {
    try {
      await ChallengeModel.findOneAndDelete({
        _id: challengeId,
        state: "open",
      });
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },

  updateChallengeById44: async (challengeId, playerId) => {
    try {
      let challenge = await ChallengeModel.findOneAndUpdate(
        { _id: challengeId, state: "open", status: 1 },
        { $set: { state: "requested", player: playerId } },
        { new: true }
      );
      return challenge;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },

  updateChallengeById22: async (challengeId) => {
    try {
      let player = await User.findOne({
        _id: challengeId.player._id,
        isBlocked: false,
        otpConfirmed: true,
      });
      let creator = await User.findOne({
        _id: challengeId.creator._id,
        isBlocked: false,
        otpConfirmed: true,
      });
      console.log("checkkknoof", player.noOfChallenges, creator.noOfChallenges);
      let challenge = await ChallengeModel.findById(challengeId._id);
      if (player.noOfChallenges === 0 && creator.noOfChallenges === 0) {
        if (!challenge) {
          throw new Error("Challenge not found");
        }

        if (challenge.state === "requested") {
          challenge.state = "playing";
          challenge.startedAt = new Date();
          await challenge.save();
        } else {
          console.log("Invalid state for updating challenge22");
          return false;
        }
      }

      return challenge;
    } catch (error) {
      console.log("error23", error);
    }
  },

  updateChallengeById23: async (challengeId) => {
    try {
      let challenge = await ChallengeModel.findOneAndUpdate(
        { _id: challengeId, state: "requested" },
        { $set: { player: null, state: "open" } },
        { new: true }
      );
      return challenge;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  deleteChallengeById: async (challengeId) => {
    try {
      let challenge = await ChallengeModel.findOneAndDelete({
        _id: challengeId,
      });
      return challenge;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },

  /**
   * getChallengeByChallengeId - to get  challenge by challenge id
   * @returns {Promise<void>}
   */
  getChallengeByChallengeId: async (challengeId) => {
    try {
      let challenge = await ChallengeModel.findById(challengeId).populate(
        "creator",
        "username"
      );
      return challenge;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },
  setLockTrue: async (challengeId) => {
    try {
      const challenge = await ChallengeModel.findById(challengeId);

      if (challenge.locked) {
        return false;
      }

      challenge.locked = true;
      await challenge.save();
      return true;
    } catch (error) {
      console.log("Error setting lock to true:", error);
      throw error;
    }
  },

  setLockFalse: async (challengeId) => {
    try {
      await ChallengeModel.findByIdAndUpdate(challengeId, { locked: false });
    } catch (error) {
      console.log("Error setting lock to false:", error);
      throw error;
    }
  },

  /**
   * getChallengeById - to get  challenge by challenge id
   * @returns {Promise<void>}
   */
  getChallengeById: async (challengeId) => {
    try {
      let challenge = await ChallengeModel.findById(challengeId).populate(
        "creator player",
        "username"
      );
      return challenge;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },
  updateChallengeStateToHold: async (challengeId) => {
    try {
      // Find the challenge by ID
      const challenge = await ChallengeModel.findById(challengeId);

      if (!challenge) {
        console.log("Challenge not found");
        return;
      }

      // Update the challenge state to "hold"
      challenge.state = "hold";
      await challenge.save();

      console.log("Challenge state updated to hold");
    } catch (error) {
      console.error("Error updating challenge state:", error);
    }
  },

  /**
   * checkChallengeLimit - userId that need to be check.
   * @param userId - userId that need to check
   * @returns {Promise<void>}
   */
  checkChallengeLimit: async (userId) => {
    try {
      if (
        (await ChallengeModel.find({
          creator: userId,
          state: { $in: ["open", "requested"] },
          status: 1,
        }).countDocuments()) === 3
      ) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      throw error;
    }
  },

  /**
   * checkSameAmountChallenge - userId that need to be check.
   * @param userId - data that need to check
   * @returns {Promise<void>}
   */
  checkSameAmountChallenge: async (data) => {
    try {
      let challenge = await ChallengeModel.find({
        creator: data.userId,
        amount: data.amount,
        status: 1,
        state: { $in: ["open", "requested"] },
      });
      return challenge;
    } catch (error) {
      throw error;
    }
  },

  /**
   * checkPlayingOrHold - challenge that need to be checked.
   * @param userId - userId that need to check
   * @returns {Promise<void>}
   */
  checkPlayingOrHold: async (userId) => {
    try {
      const { noOfChallenges } = await User.findById(userId);
      console.log("nooffchallenges", noOfChallenges);
      if (noOfChallenges > 0) {
        return false;
      } else {
        return true;
      }
    } catch (error) {
      throw error;
    }
  },
  /**
   * checkPlayingOrHold - challenge that need to be checked.
   * @param userId - userId that need to check
   * @returns {Promise<void>}
   */
  checkOpenOrRequested: async (userId) => {
    try {
      let challenge = await ChallengeModel.find({
        $or: [{ creator: userId }, { player: userId }],
        state: { $in: ["open", "requested"] },
        status: 1,
      });
      return challenge;
    } catch (error) {
      throw error;
    }
  },

  /**
   * checkIfUserIsCreator - challenge that need to be checked.
   * @param userId - userId that need to check
   * @returns {Promise<void>}
   */
  checkIfUserIsCreator: async (userId, challengeId) => {
    try {
      let challenge = await ChallengeModel.find({
        _id: challengeId,
        creator: userId,
      });
      return challenge;
    } catch (error) {
      throw error;
    }
  },

  /**
   * checkAlreadyRequestedGame - check if user has already requested a game
   * @param userId - userId that need to check
   * @returns {Promise<void>}
   */
  checkAlreadyRequestedGame: async (userId) => {
    try {
      let challenge = await ChallengeModel.find({
        player: userId,
        state: "requested",
      });
      return challenge;
    } catch (error) {
      throw error;
    }
  },

  //     /**
  // * checkRequestedChallenge - challenge that need to be checked.
  // * @param userId - userId that need to check
  // * @returns {Promise<void>}
  // */
  // checkRequestedChallenge: async (userId, challengeId) => {
  //         try {
  //             let challenge = await ChallengeModel.find({ _id: challengeId, creator: userId })
  //             return challenge
  //         } catch (error) {
  //             throw error
  //         }
  //     },
};

module.exports = challengesController;
