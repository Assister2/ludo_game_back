var express = require("express");
const Router = express.Router();

const {
  login,
  logout,
  signup,
  confirmOTP,
  resendOTP,
  OTP,
} = require("../controllers/authController");

Router.post("/login", login);

Router.get("/logout", logout);

Router.post("/signup", signup);

Router.post("/confirmOTP", confirmOTP);

Router.post("/OTP", OTP);

Router.post("/resendOTP", resendOTP);

module.exports = Router;
