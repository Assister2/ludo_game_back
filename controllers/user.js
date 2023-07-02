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
  existingReferCode: async (referCode) => {
    try {
      let user = await User.findOne({
        referCode: referCode,
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
   * @param referCode - referelCode that need to check
   * @returns {Promise<void>}
   */
  increasenoOfrefer: async (referCode) => {
    try {
      let user = await User.findOneAndUpdate(
        {
          referCode: referCode,
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
   * @param referCode - referelCode that need to check
   * @returns {Promise<void>}
   */
  existingUserByReferelId: async (referCode) => {
    try {
      let user = await User.findOne({
        referCode: referCode,
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
        "234124qweASd"
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
  setUserLockTrue: async (userId) => {
    try {
      await User.findByIdAndUpdate(userId, { locked: true });
    } catch (error) {
      console.log("Error setting for user lock to true:", error);
      throw error;
    }
  },
  setUserLockFalse: async (userId) => {
    try {
      await User.findByIdAndUpdate(userId, { locked: false });
    } catch (error) {
      console.log("Error setting lock for user to false:", error);
      throw error;
    }
  },
  increamentNoOfChallengesUserByUserId: async (userObj) => {
    try {
      let user = await User.findById(userObj._id);

      if (!user) {
        throw new Error("User not found");
      }

      if (user.noOfChallenges === 0) {
        user.noOfChallenges = 1;

        user = await user.save();
        return user;
      }
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
