let io;

const authSocketMiddleware = require("../../middleware/RSocket.js");
const allowedOrigins = require("../../origion/allowedOrigins.js");

module.exports = {
  init: (server) => {
    io = require("socket.io")(server, {
      pingTimeout: 500,
      perMessageDeflate: true,
      cors: {
        origin: allowedOrigins,
      },
    });
    io.use((socket, next) => {
      authSocketMiddleware(socket, next);
    });

    return io;
  },
  get: () => {
    if (!io) {
      throw new Error("Socket is not initialized");
    }
    return io;
  },
};
