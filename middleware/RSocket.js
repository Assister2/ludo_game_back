const jwt = require("jsonwebtoken");
const config = require("../helpers/config");
const { client } = require("../allSocketConnection");

const authSocketMiddleware = async (socket, next) => {
  // since you are sending the token with the query
  // const token = socket.handshake.auth?.token;
  // try {
  //   const decoded = jwt.verify(token, config.TOKEN_SECRET);
  //   socket.user = decoded;
  // } catch (err) {
  //   return next(new Error("NOT AUTHORIZED"));
  // }
  const userId = socket.handshake.auth?.userId;
  
  if(userId) {
    const previousSocketId = await client.get(userId.toString());
    if (previousSocketId) {
      client.del(userId);
    }
    await client.set(userId.toString(), socket.id.toString());
    console.log(socket.id);
  }
  
  next();
};

module.exports = authSocketMiddleware;
