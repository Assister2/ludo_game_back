const dotenv = require("dotenv");

const { getUserWallet, ludoGame, playGame, message } = require('./sockets');
const Message = require("./sockets/message");
dotenv.config();
if (config.NODE_ENV === "production") {
  bot = new TelegramBotHandler(config.BOT_TOKEN);
}
function handleConnection(socket, io) {
  const HEARTBEAT_INTERVAL = 30000;
  
  getUserWallet(socket);
  ludoGame(socket);
  playGame(socket);

  console.log("socket connected");
  socket.send(JSON.stringify({ type: "heartbeat" }));

  const heartbeatInterval = setInterval(() => {
    if (socket.connected) {
      socket.send(JSON.stringify({ type: "heartbeat" }));
    } else {
      clearInterval(heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL);

  message(socket);

  socket.on("close", (code, reason) => {
    console.log("WebSocket connection Closed:", code, reason);
    clearInterval(heartbeatInterval);
  });
}

module.exports = handleConnection;
