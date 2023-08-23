const { ConfirmPayment } = require("../controllers/transactionController");
const express = require("express");
const router = express.Router();

router.post("/confirmpayment", ConfirmPayment);

module.exports = router;
