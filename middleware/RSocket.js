const jwt = require("jsonwebtoken");
const config = require("../helpers/config");

const authSocketMiddleware = async (socket, next) => {
  // since you are sending the token with the query
  const token = socket.handshake.auth?.token;
  try {
    const decoded = jwt.verify(token, config.TOKEN_SECRET);
    socket.user = decoded;
  } catch (err) {
    return next(new Error("NOT AUTHORIZED"));
  }

  next();
};

module.exports = authSocketMiddleware;
