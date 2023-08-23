const express = require("express");
const {
  historyHandler,
} = require("../controllers/historyControllers/historyHandlers");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

router.get("/", verifyToken, historyHandler);
module.exports = router;
