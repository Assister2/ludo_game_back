const { express, verifyToken } = require("../commonImports/commonImports");
const {
  handleBuyChips,
  handleSellChips,
  handleGetWallet,
  ConfirmPayment,
} = require("../controllers/transactionsControllers/routeHandlers");

const router = express.Router();

router.post("/buy", verifyToken, handleBuyChips);
router.post("/sell", verifyToken, handleSellChips);
router.get("/wallet", verifyToken, handleGetWallet);
router.post("/confirmpayment", ConfirmPayment);

module.exports = router;
