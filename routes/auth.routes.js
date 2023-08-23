var express = require("express");
var router = express.Router();

const {
  login,
  logout,
  signup,
  confirmOTP,
  OTP,
  resendOTP,
} = require("../controllers/authControllers/authHandlers");
// const { _app } = require("../firebaseInit");

router.post("/login", login);

router.get("/logout", logout);

router.post("/signup", signup);

router.post("/confirmOTP", confirmOTP);

router.post("/OTP", OTP);

router.post("/resendOTP", resendOTP);

module.exports = router;
