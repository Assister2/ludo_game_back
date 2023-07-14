let io;
const authSocketMiddleware = require("./middleware/RSocket");
module.exports = {
  init: (server) => {
    io = require("socket.io")(server, {
      pingTimeout: 500,
      cors: {
        origin: "*",
      },
      // cors: {
      //   origin: function (origin, callback) {
      //     console.log("checksocket", origin);
      //     // Add your CORS logic here
      //     const allowedOrigins = [
      //       "https://www.gotiking.com/",
      //       "https://gotiking.com",
      //       "https://gotiking.com/",
      //       "https://www.gotiking.com",
      //       "http://localhost:3000",
      //       // Add more allowed origins if needed
      //     ];

      //     if (!origin || allowedOrigins.includes(origin)) {
      //       callback(null, true);
      //     } else {
      //       callback(new Error("Not allowed by CORS"));
      //     }
      //   },
      // },
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
