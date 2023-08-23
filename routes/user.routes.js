const express = require("express");
const {
  getUserProfileData,
  updateUserProfile,
} = require("../controllers/userController");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

router.get("/getUserProfileData", verifyToken, getUserProfileData);

router.post("/updateUserProfile", verifyToken, updateUserProfile);
module.exports = router;
