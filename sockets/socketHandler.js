const dotenv = require("dotenv");
const config = require("../helpers/config");
const { getUserWallet, ludoGame, playGame, message } = require("./index");
dotenv.config();
if (config.NODE_ENV === "production") {
  bot = new TelegramBotHandler(config.BOT_TOKEN);
}
function handleConnection(socket, io) {
  const HEARTBEAT_INTERVAL = 30000;

  getUserWallet(socket, io);
  ludoGame(socket, io);
  playGame(socket, io);

  console.log("socket connected");
  socket.send(JSON.stringify({ type: "heartbeat" }));

  const heartbeatInterval = setInterval(() => {
    if (socket.connected) {
      socket.send(JSON.stringify({ type: "heartbeat" }));
    } else {
      clearInterval(heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL);

  message(socket, io);

  socket.on("close", (code, reason) => {
    console.log("WebSocket connection Closed:", code, reason);
    clearInterval(heartbeatInterval);
  });
}

module.exports = handleConnection;
