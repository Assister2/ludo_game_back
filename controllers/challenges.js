const ChallengeModel = require("../models/challenges");

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

  /**
   * getAllChallenges - to get all challenges
   * @returns {Promise<void>}
   */
  getAllChallenges: async (challengeObject) => {
    try {
      let challenge = await ChallengeModel.find({
        status: 1,
        state: { $ne: "resolved" },
      }).populate("creator player", "username profileImage");
      return challenge;
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
      let canCreate = false;
      let challenge = await ChallengeModel.find({
        $or: [{ creator: userId }, { player: userId }],
        state: { $in: ["playing", "hold"] },
      });
      // if (challenge.length > 0) {
      //   canCreate = false;
      // }

      // let challenge = await ChallengeModel.find({
      //   $or: [{ creator: userId }, { player: userId }],
      //   state: { $in: ["hold"] },
      // });
      // console.log("checkkk2", challenge2);
      
      if (challenge.length > 0) {
        challenge.map((item) => {
          if (item.creator == userId) {
            // User is a creator
            if (
              item.results.creator &&
              item.results.creator !== null &&
              item.results.creator !== undefined
            ) {
              canCreate = true;
            } else {
              canCreate = false;
            }
          } else if (item.player == userId) {
            // User is a player

            if (
              item.results.player &&
              item.results.player !== null &&
              item.results.player !== undefined
            ) {
              canCreate = true;
            } else {
              canCreate = false;
            }
          }
        });
      } else if (challenge.length == 0) {
        canCreate = true;
      }
      

      return canCreate;
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
