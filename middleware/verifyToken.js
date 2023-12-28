const jwt = require("jsonwebtoken");
const config = require("../helpers/config");

module.exports = function (req, res, next) {
  const Token = req.header("Authorization");
  if (!Token) return res.status(401).send("Access Denied");

  const key = config.TOKEN_SECRET;
  try {
      const verified = jwt.verify(Token, key);
      console.log("VERIFY FUNCTION", verified);
      req.user = verified;
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (verified == undefined || verified == null || verified.exp < currentTime) {
        const newToken = jwt.generateToken(verified.userId);
        console.log("ERROR FULL", newToken);
        return res.status(401).json({ error: "Token expired", token: newToken });
      }
      next();

  } catch (error) {
    console.log(error.constructor.name);
    if (error.constructor.name == "TokenExpiredError"){
      return res.status(401).json({ error: "Token expired", error_status: "expired" });
    }else{
      res.status(400).send("Invalid Token");
    }
  }
};
