const ChallengeModel = require("../models/challenges");
const User = require("../models/user");
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
  deleteOpenChallengesCreator: async (creatorId) => {
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
  cancelRequestedChallenges: async (creatorId) => {
    try {
      let challenge = await ChallengeModel.updateMany(
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
      let challenge = await ChallengeModel.findById(challengeId);

      if (!challenge) {
        throw new Error("Challenge not found");
      }

      if (challenge.state === "open" && challenge.status === 1) {
        challenge.status = 0;
        await challenge.save();
      } else {
        throw new Error("challenge not Deleted");
      }

      return challenge;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },

  updateChallengeById44: async (challengeId, playerId) => {
    try {
      let challenge = await ChallengeModel.findById(challengeId);

      if (!challenge) {
        throw new Error("Challenge not found");
      }

      if (challenge.state === "open" && challenge.status === 1) {
        challenge.state = "requested";
        challenge.player = playerId;
        await challenge.save();
      } else {
        throw new Error("challenge in requested state");
      }

      return challenge;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },
  updateChallengeById22: async (challengeId) => {
    try {
      let challenge = await ChallengeModel.findById(challengeId);

      if (!challenge) {
        throw new Error("Challenge not found");
      }

      if (challenge.state === "requested") {
        challenge.state = "playing";
        await challenge.save();
      } else {
        throw new Error("Invalid state for updating challenge22");
      }

      return challenge;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },
  updateChallengeById23: async (challengeId) => {
    try {
      let challenge = await ChallengeModel.findById(challengeId);

      if (!challenge) {
        throw new Error("Challenge not found");
      }

      if (challenge.state === "requested") {
        challenge.player = null;
        challenge.state = "open";
        await challenge.save();
      } else {
        throw new Error("Invalid state for updating challenge234");
      }

      return challenge;
    } catch (error) {
      console.log("error", error);
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
