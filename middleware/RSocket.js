const jwt = require("jsonwebtoken");
const config = require("../helpers/config");
const userSockets = require("../allSocketConnection");

const authSocketMiddleware = (socket, next) => {
  // since you are sending the token with the query
  const token = socket.handshake.auth?.token;
  try {
    const decoded = jwt.verify(token, config.TOKEN_SECRET);
    socket.user = decoded;
  } catch (err) {
    return next(new Error("NOT AUTHORIZED"));
  }

  if (userSockets.has(socket.user.id)) {
    const previousSocket = userSockets.get(socket.user.id);
    previousSocket.emit("logout", {});
    previousSocket.disconnect();
    userSockets.delete(socket.user.id);
  }
  userSockets.set(socket.user.id, socket);
  console.log("allsocketconnection", Array.from(userSockets.keys()));
  next();
};

module.exports = authSocketMiddleware;
