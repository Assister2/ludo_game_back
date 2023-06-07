const User = require("../models/user");
const jwtToken = require("jsonwebtoken");
const userController = {
  /**
   * existingUser - Check existing user by phone Number.
   * @param number - number that need to check
   * @returns {Promise<void>}
   */
  existingUser: async (number) => {
    try {
      let user = await User.findOne({
        phone: number,
      });

      return user;
    } catch (error) {
      throw error;
    }
  },

  /**
   * existingUserById - Check existing user by user id.
   * @param user - user that need to check
   * @returns {Promise<void>}
   */
  existingUserById: async (userData) => {
    try {
      let user = await User.findOne({
        _id: userData.id,
        isBlocked: false,
        otpConfirmed: true,
      });
      return user;
    } catch (error) {
      throw error;
    }
  },
  /**
   * existingUserByReferelId - get existing user by referel code.
   * @param referelCode - referelCode that need to check
   * @returns {Promise<void>}
   */
  increasenoOfrefer: async (referelCode) => {
    try {
      let user = await User.findOneAndUpdate(
        {
          referelCode: referelCode,
        },
        { $inc: { totalRefer: 1 } }, // Increment totalRefer field by 1
        { new: true } // Return the updated document
      );
      return user;
    } catch (error) {
      throw error;
    }
  },

  /**
   * existingUserByReferelId - get existing user by referel code.
   * @param referelCode - referelCode that need to check
   * @returns {Promise<void>}
   */
  existingUserByReferelId: async (referelCode) => {
    try {
      let user = await User.findOne({
        referelCode: referelCode,
        isBlocked: false,
        otpConfirmed: true,
      });
      return user;
    } catch (error) {
      throw error;
    }
  },

  /**
   * insertUser - insert user .
   * @param object - object that need to insert
   * @returns {Promise<void>}
   */
  insertUser: async (object) => {
    try {
      let user = new User(object);
      await user.save();
      return user;
    } catch (error) {
      throw error;
    }
  },

  /**
   * issueToken - issueToken function will issue JWT token against a user id.
   * @param userData - user data that need to issue token
   * @returns {Promise<void>}
   */

  issueToken: async (userData) => {
    try {
      let tokenGenerated = jwtToken.sign(
        {
          id: userData._id,
          phone: userData.phone,
        },
        process.env.TOKEN_SECRET
      );

      let tokenObject = {
        jwtToken: tokenGenerated,
        createdAt: new Date(),
      };
      let user = await User.findOneAndUpdate(
        { phone: userData.phone },
        { $set: { jwtToken: tokenObject } },
        { new: true }
      );
      if (!userData.hasOwnProperty("jwtToken")) {
        userData.jwtToken = {};
      }
      userData.jwtToken = tokenObject;
      return userData;
    } catch (error) {
      throw error;
    }
  },

  /**
   * updateUserByPhoneNumber - update user by his phone number.
   * @param phoneNumber - phoneNumber that need to check
   * @returns {Promise<void>}
   */
  updateUserByPhoneNumber: async (userData) => {
    try {
      let user = await User.findOneAndUpdate(
        { phone: userData.phone },
        { $set: userData },
        { new: true }
      );
      return user;
    } catch (error) {
      throw error;
    }
  },
  updateUserByUserId: async (userObj) => {
    try {
      let user = await User.findOneAndUpdate(
        { _id: userObj._id },
        { $set: userObj },
        { new: true }
      );
      return user;
    } catch (error) {
      throw error;
    }
  },
  increamentNoOfChallengesUserByUserId: async (userObj) => {
    try {
      let user = await User.findOneAndUpdate(
        { _id: userObj._id },
        {
          $set: userObj,
          $inc: { noOfChallenges: 1 }, // Increment noOfChallenges by 1
        },
        { new: true }
      );
      return user;
    } catch (error) {
      throw error;
    }
  },
  findUserById: async (userId) => {
    try {
      const user = await User.findById(userId);
      return user;
    } catch (error) {
      throw error;
    }
  },
};

module.exports = userController;
