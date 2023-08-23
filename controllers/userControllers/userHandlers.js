const accountController = require("../accounts");
const userController = require("../user");
const { responseHandler } = require("../../helpers");
const Challenge = require("../../models/challenges");

const getUserProfileData = async (req, res) => {
  try {
    let user = req.user;
    let userData = await userController.existingUserById(user);

    if (!userData) {
      return responseHandler(res, 400, null, "User not found");
    }

    let account = await accountController.getAccountByUserId(user.id);
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
    let existing = await userController.existingUserByName(name, user.id);
    let userData = await userController.existingUserById(user);
    if (!userData) {
      return responseHandler(res, 400, null, "User not found");
    } else {
      if (!existing) {
        let userObj = { ...req.body, phone: userData.phone };
        userData = await userController.updateUserByPhoneNumber(userObj);
      }
    }
    let account = await accountController.getAccountByUserId(user.id);
    userData._doc.account = account;
    const count = await Challenge.countDocuments({
      $or: [{ creator: user.id }, { player: user.id }],
      state: { $nin: ["playing", "open", "requested"] },
    });
    userData._doc.gamesPlayed = count;
    if (existing) {
      return responseHandler(res, 400, userData, "username already exist");
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
