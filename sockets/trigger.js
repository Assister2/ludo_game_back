const { client } = require("../allSocketConnection");
const { io } = require("../app");

const trigger = async (event, userId, data) => {
  const socketId = await client.get(userId);
  if (socketId) {
    console.log(socketId, io);
    const socket = await io.sockets.sockets.get(socketId);
    socket.emit(
      event,
      JSON.stringify({
        status: 200,
        error: null,
        data: data,
      })
    );
  }
};

module.exports = { trigger };
