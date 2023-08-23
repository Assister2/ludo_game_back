const verifyToken = require("../middleware/verifyToken");
const express = require("express");
const {
  handleBuyChips,
  handleSellChips,
  handleGetWallet,
} = require("../controllers/transactionController");

const router = express.Router();

router.post("/buy", verifyToken, handleBuyChips);
router.post("/sell", verifyToken, handleSellChips);
router.get("/wallet", verifyToken, handleGetWallet);

module.exports = router;
