const accountHelper = require("../helpers/accountHelper");

const getUserWallet = (socket) => {
  socket.on("getUserWallet", async (message) => {
    try {
      const data = JSON.parse(message);
      const connections = {};
      const userId = data.payload.userId;
      connections[userId] = socket;

      switch (data.type) {
        case "getUserWallet":
          try {
            let wallet = await accountHelper.getAccountByUserId(
              data.payload.userId
            );
            socket.emit(
              "getUserWallet",
              JSON.stringify({ status: 200, error: null, data: wallet })
            );
          } catch (error) {
            return socket.emit(
              "getUserWallet",
              JSON.stringify({ status: 400, error: error.message, data: null })
            );
          }
      }
    } catch (error) {
      return socket.send(
        JSON.stringify({ status: 400, error: error, data: null })
      );
    }
  });
};

module.exports = getUserWallet;
