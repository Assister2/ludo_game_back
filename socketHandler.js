const dotenv = require("dotenv");

const { getUserWallet, ludoGame, playGame } = require('./sockets');
dotenv.config();


function handleConnection(socket) {
  const HEARTBEAT_INTERVAL = 30000;
  
  getUserWallet(socket);

  //todo:game
  ludoGame(socket);

  //todo:play
  playGame(socket)

  console.log("socket connected");
  socket.send(JSON.stringify({ type: "heartbeat" }));

  const heartbeatInterval = setInterval(() => {
    if (socket.connected) {
      socket.send(JSON.stringify({ type: "heartbeat" }));
    } else {
      clearInterval(heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL);

  
  socket.on("close", (code, reason) => {
    console.log("WebSocket connection Closed:", code, reason);
    clearInterval(heartbeatInterval);
  });
}

module.exports = handleConnection;
