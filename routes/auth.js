var express = require("express");

const accountController = require("../controllers/accounts");

var router = express.Router();
const mongoose = require("mongoose");
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

router.post("/login", async (req, res) => {
  try {
    if (!req.body.hasOwnProperty("phone")) {
      return responseHandler(res, 400, null, "Fields are missing");
    }

    let user = await userController.existingUser(req.body.phone);

    if (!user) {
      return responseHandler(res, 400, null, "User not found");
    } else {
      if (user.isBlocked) {
        return responseHandler(
          res,
          400,
          null,
          "your Account has been blocked. !Contact Admin"
        );
      }

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
        req.sessionStore.all(function (err, sessions) {
          if (err) {
            console.error("Error fetching sessions:", err);
            res.status(500).send({ Success: "Server error" });
            return;
          }

          const activeSessions = sessions.filter((n) =>
            n.session.user._id.equals(user._id)
          );

          activeSessions.forEach((session) => {
            req.sessionStore.destroy(session._id, function (err) {
              if (err) {
                console.error("Error destroying session:", err);
              }
            });
          });
        });
        return responseHandler(res, 200, "OTP Sent", user);
      }
    }
  } catch (error) {
    responseHandler(res, 400, null, error.message);
  }
});

router.post("/logout", async (req, res) => {
  try {
    if (!req.session.user) {
      return responseHandler(res, 400, null, "User not logged in");
    }
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return responseHandler(res, 500, null, "Server error");
      }
      return responseHandler(res, 200, "Logout successful", null);
    });
  } catch (error) {
    return responseHandler(res, 400, null, error.message);
  }
});

router.post("/signup", async (req, res) => {
  try {
    if (
      !req.body.hasOwnProperty("fullName") ||
      !req.body.hasOwnProperty("phone")
    ) {
      return responseHandler(res, 400, null, "Fields are missing");
    } else {
      const session = await mongoose.startSession();
      session.startTransaction();
      let userName = await checkUserName(req.body.fullName);
      let user = await userController.existingUser(req.body.phone);
      await userController.deleteExistingTempUser(req.body.phone, session);
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
      userData.referCode = generate();
      userData.profileImage = `${randomIntFromInterval(1, 9)}.svg`;
      console.log("req.body", req.body);
      if (req.body.referCode) {
        userData.referer = Number(req.body.referCode);
      }
      userData.otp = {
        code: generate(6),
        updatedAt: new Date(),
      };
      if (req.body.referCode) {
        userData.wallet = 50;
      }

      // let textRes = await sendText(userData.otp.code, userData.phone);
      if (false) {
        return responseHandler(res, 400, null, textRes.message);
      } else {
        user = await userController.tempInsertUser(userData, session);

        // await accountController.insertAccount(accountObject);
        await session.commitTransaction();
        session.endSession();

        return responseHandler(res, 200, "OTP Sent", null);
      }
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.log("error", error);
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
          user = await userController.updateUserByPhoneNumber(user);
          await userController.issueToken(user);
          req.session.user = { _id: user._id, username: user.username };

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

    if (!req.body.hasOwnProperty("phone") || !req.body.hasOwnProperty("otp")) {
      return responseHandler(res, 400, null, "Fields are missing");
    } else {
      let user = await userController.existingTempUser(req.body.phone);
      let realUser = await userController.existingUser(req.body.phone);
      if (realUser) {
        return responseHandler(res, 400, null, "This Number already in Use");
      }
      if (!user) {
        return responseHandler(res, 400, null, "This Number is Not Registered");
      } else {
        const session = await mongoose.startSession();
        session.startTransaction();
        let min = 2; // Days you want to subtract
        let date = new Date();
        let last = new Date(date.getTime() - min * 60 * 1000);
        if (user.otp.updatedAt < last) {
          return responseHandler(res, 400, null, "OTP is expired");
        }

        if (false) {
          return responseHandler(
            res,
            400,
            null,
            "Incorrect OTP Please try again"
          );
        } else {
          user.otp.count = 0;
          user.otpConfirmed = true;
          const final = await userController.insertUser(user, session);
          await userController.deleteUser(user._id, session);
          await userController.issueToken(final, session);
          req.session.user = { _id: user._id, username: user.username };
          let accountObject = {
            userId: final.id,
          };
          await accountController.insertAccount(accountObject, session);
          if (user.referer) {
            await userController.increasenoOfrefer(user.referer, session);
          }
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
          await session.commitTransaction();
          session.endSession();
          return responseHandler(res, 200, final, null);
        }
      }
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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

      // let textRes = await sendText(user.otp.code, user.phone);
      // textRes.return = true;

      if (false) {
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
