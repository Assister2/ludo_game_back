const accountHelper = require("../helpers/accountHelper");
const userHelper = require("../helpers/userHelper");
const { responseHandler } = require("../helpers");
const Challenge = require("../models/challenges");

const getUserProfileData = async (req, res) => {
  try {
    let user = req.user;
    let userData = await userHelper.existingUserById(user);

    if (!userData) {
      return responseHandler(res, 400, null, "User not found");
    }

    let account = await accountHelper.getAccountByUserId(user.id);
    userData._doc.account = account;

    const count = await Challenge.countDocuments({
      $or: [{ creator: user.id }, { player: user.id }],
      state: { $nin: ["playing", "open", "requested"] },
    });
    userData._doc.gamesPlayed = count;

    return responseHandler(res, 200, userData, null);
  } catch (error) {
    return responseHandler(res, 400, null, error.message);
  }
};

const updateUserProfile = async (req, res) => {
  try {
    let user = req.user;
    let name = req.body.username;
    let existing = await userHelper.existingUserByName(name, user.id);
    let userData = await userHelper.existingUserById(user);
    if (!userData) {
      return responseHandler(res, 400, null, "User not found");
    } else {
      if (!existing) {
        let userObj = { ...req.body, phone: userData.phone };
        userData = await userHelper.updateUserByPhoneNumber(userObj);
      }
    }
    let account = await accountHelper.getAccountByUserId(user.id);
    userData._doc.account = account;
    const count = await Challenge.countDocuments({
      $or: [{ creator: user.id }, { player: user.id }],
      state: { $nin: ["playing", "open", "requested"] },
    });
    userData._doc.gamesPlayed = count;
    if (existing) {
      return responseHandler(res, 400, userData, "Username already exist");
    }
    return responseHandler(res, 200, userData, "Profile Updated");
  } catch (error) {
    return responseHandler(res, 400, null, error.message);
  }
};

module.exports = {
  getUserProfileData,
  updateUserProfile,
};
