var express = require("express");
const accountController = require("../controllers/accounts");
var router = express.Router();
const auth = require("../controllers/auth");
const userController = require("../controllers/user");
const {
  responseHandler,
  generate,
  randomIntFromInterval,
} = require("../helpers");
const sendText = require("../helpers/sendSMS");
const User = require("../models/user");
const checkUserName = require("../services");
// const { _app } = require("../firebaseInit");
var dataStore = null;
router.post("/signup", async (req, res) => {
  try {
    if (
      !req.body.hasOwnProperty("fullName") ||
      !req.body.hasOwnProperty("phone")
    ) {
      return responseHandler(res, 400, null, "Fields are missing");
    } else {
      let userName = await checkUserName(req.body.fullName);
      let user = await userController.existingUser(req.body.phone);
      if (user) {
        return responseHandler(
          res,
          400,
          null,
          "Already registered please try to login"
        );
      }

      let userData = {};
      userData.username = userName;
      userData.joinedAt = new Date();
      userData.phone = req.body.phone;
      userData.fullName = req.body.fullName;
      userData.referelCode = generate(10);
      userData.profileImage = `${randomIntFromInterval(1, 4)}.svg`;
      console.log("req.body", req.body);
      if (req.body.referelCode) {
        let user = await userController.existingReferCode(req.body.referelCode);
        if (user) {
          userData.referer = Number(req.body.referelCode);
        } else {
          userData = {};
          return responseHandler(res, 400, null, "refer code not found");
        }
      }
      userData.otp = {
        code: generate(6),
        updatedAt: new Date(),
      };
      if (req.body.referelCode) {
        userData.wallet = 50;
      }

      let textRes = await sendText(userData.otp.code, userData.phone);
      if (textRes.return === false) {
        return responseHandler(res, 400, null, textRes.message);
      } else {
        dataStore = userData;
        // user = await userController.insertUser(userData);
        // let accountObject = {
        //   userId: user.id,
        // };
        // await accountController.insertAccount(accountObject);
        return responseHandler(res, 200, "OTP Sent", null);
      }
    }
  } catch (error) {
    console.log("error1212", error);
    responseHandler(res, 400, null, error.message);
  }
});

router.post("/login", async (req, res) => {
  try {
    if (!req.body.hasOwnProperty("phone")) {
      return responseHandler(res, 400, null, "Fields are missing");
    }
    let user = await userController.existingUser(req.body.phone);
    if (!user) {
      return responseHandler(res, 400, null, "User not found");
    } else {
      let currentDate = new Date();
      let lastUpdateDate = user.otp.updatedAt;
      var seconds = (currentDate.getTime() - lastUpdateDate.getTime()) / 1000;

      if (seconds <= 3600 && user.otp.count >= 5) {
        return responseHandler(
          res,
          400,
          null,
          "Can Request For 5 OTP In One hour Maximum"
        );
      }
      user.otp = {
        code: generate(6),
        updatedAt: new Date(),
        count: user.otp.count + 1,
      };

      // let textRes = await sendText(user.otp.code, user.phone);
      let textRes;
      textRes = true;
      if (textRes === false) {
        return responseHandler(res, 400, null, textRes.message);
      } else {
        user = await userController.updateUserByPhoneNumber(user);
        return responseHandler(res, 200, "OTP Sent", null);
      }
    }
  } catch (error) {
    responseHandler(res, 400, null, error.message);
  }
});

router.post("/confirmOTP", async (req, res) => {
  try {
    const { body } = req;
    const { token } = body;
    const topic = "ludo";
    console.log("---------token", body);
    if (!req.body.hasOwnProperty("phone") || !req.body.hasOwnProperty("otp")) {
      return responseHandler(res, 400, null, "Fields are missing");
    } else {
      let user = await userController.existingUser(req.body.phone);
      if (!user) {
        return responseHandler(res, 400, null, "This Number is Not Registered");
      } else {
        let min = 2; // Days you want to subtract
        let date = new Date();
        let last = new Date(date.getTime() - min * 60 * 1000);
        if (user.otp.updatedAt < last) {
          return responseHandler(res, 400, null, "OTP is expired");
        }

        // if (user.otp.code != req.body.otp) {
        //   return responseHandler(
        //     res,
        //     400,
        //     null,
        //     "Incorrect OTP Please try again"
        //   );
        // }
        else {
          user.otp.count = 0;
          user.otpConfirmed = true;
          await userController.updateUserByPhoneNumber(user);
          await userController.issueToken(user);
          // try {
          //   await _app
          //     .messaging()
          //     .subscribeToTopic(token, topic)
          //     .then((resp) => {
          //       console.log(resp);
          //     })
          //     .catch((err) => {
          //       console.log(err);
          //     });
          // } catch (err) {
          //   console.log("fcm", err);
          // }
          return responseHandler(res, 200, user, null);
        }
      }
    }
  } catch (error) {
    responseHandler(res, 400, null, error.message);
  }
});
router.post("/OTP", async (req, res) => {
  try {
    const { body } = req;
    const { token } = body;
    const topic = "ludo";
    console.log("---------token", body);
    if (!req.body.hasOwnProperty("phone") || !req.body.hasOwnProperty("otp")) {
      return responseHandler(res, 400, null, "Fields are missing");
    } else if (dataStore.phone) {
      let user = await userController.insertUser(dataStore);

      if (user && dataStore.referer) {
        await userController.increasenoOfrefer(dataStore.referer);
      }

      let accountObject = {
        userId: user.id,
      };
      user = await userController.existingUser(req.body.phone);
      await accountController.insertAccount(accountObject);
      if (!user) {
        return responseHandler(res, 400, null, "This Number is Not valid");
      } else {
        let min = 2; // Days you want to subtract
        let date = new Date();
        let last = new Date(date.getTime() - min * 60 * 1000);
        if (user.otp.updatedAt < last) {
          return responseHandler(res, 400, null, "OTP is expired");
        }

        // if (user.otp.code != req.body.otp) {
        //   return responseHandler(
        //     res,
        //     400,
        //     null,
        //     "Incorrect OTP Please try again"
        //   );
        // }
        else {
          user.otp.count = 0;
          user.otpConfirmed = true;
          await userController.updateUserByPhoneNumber(user);
          await userController.issueToken(user);
          // try {
          //   await _app
          //     .messaging()
          //     .subscribeToTopic(token, topic)
          //     .then((resp) => {
          //       console.log(resp);
          //     })
          //     .catch((err) => {
          //       console.log(err);
          //     });
          // } catch (err) {
          //   console.log("fcm", err);
          // }
          return responseHandler(res, 200, user, null);
        }
      }
    }
  } catch (error) {
    responseHandler(res, 400, null, error.message);
  }
});

router.post("/resendOTP", async (req, res) => {
  try {
    if (!req.body.hasOwnProperty("phone")) {
      return responseHandler(res, 400, null, "Fields are missing");
    }

    // Check if the user already exists in the database
    let user = await userController.existingUser(req.body.phone);

    if (user) {
      // User already exists, proceed with resending the OTP
      let currentDate = new Date();
      let lastUpdateDate = user.otp.updatedAt;
      var seconds = (currentDate.getTime() - lastUpdateDate.getTime()) / 1000;

      if (seconds <= 3600 && user.otp.count >= 5) {
        return responseHandler(
          res,
          400,
          null,
          "Can Request For 5 OTP In One hour Maximum"
        );
      }

      // Generate a new OTP and update the user's OTP information
      user.otp = {
        code: generate(6),
        updatedAt: new Date(),
        count: user.otp.count + 1,
      };

      let textRes = await sendText(user.otp.code, user.phone);
      textRes.return = true;

      if (textRes.return === false) {
        return responseHandler(res, 400, null, textRes.message);
      } else {
        user = await userController.updateUserByPhoneNumber(user);
        return responseHandler(res, 200, "OTP Sent", null);
      }
    } else {
      const otp = {
        code: generate(6),
        updatedAt: new Date(),
        count: 1,
      };
      return responseHandler(res, 200, "OTP Sent", null);
    }
  } catch (error) {
    responseHandler(res, 400, null, error.message);
  }
});

module.exports = router;
