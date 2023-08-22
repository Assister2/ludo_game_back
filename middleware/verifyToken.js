const jwt = require("jsonwebtoken");
const config = require("../helpers/config");

module.exports = function (req, res, next) {
  const Token = req.header("Authorization");
  if (!Token) return res.status(401).send("Access Denied");

  const key = config.TOKEN_SECRET;
  console.log("key", key);
  try {
    const verified = jwt.verify(Token, key);
    req.user = verified;

    const currentTime = Math.floor(Date.now() / 1000);

    if (decoded.exp < currentTime) {
      const newToken = generateToken(decoded.userId);

      return res.status(401).json({ error: "Token expired", token: newToken });
    }

    next();
  } catch (error) {
    console.log("error", error);
    res.status(400).send("Invalid Token");
  }
};
