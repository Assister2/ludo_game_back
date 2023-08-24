// sessionHelper.js


const { client } = require("../redis/allSocketConnection");
const socket = require("../sockets/socketConnection/socket");


async function removeUserSession(userId, sessionId) {
  try {
    const io = socket.get();

    const prev_session = await client.get("userId:" + userId);

    if (prev_session) {
      const lastSocket = await client.get(userId);

      if (lastSocket) {
        const previousSocket = await io.sockets.sockets.get(lastSocket);

        if (previousSocket) {
          // Logout event
          previousSocket.emit("logout", {});
          previousSocket.disconnect(true);
        }
      }
      client.del(userId.toString());
    }
    await client.del("sess:" + prev_session);
    await client.del("userId:" + userId);

    this.addActiveUserSession(userId, sessionId);
  } catch (error) {
    console.error("Error removing user sessions:", error);
  }
}

async function addActiveUserSession(userId, sessionId) {
  try {
    client.set("userId:" + userId, sessionId);
  } catch (error) {
    console.error("Error removing user sessions:", error);
  }
}

async function removeActiveUserSession(userId) {
  const prev_session = await client.get(userId);

  if (prev_session) {
    await client.del("sess:" + prev_session);
    await client.del("userId:" + userId);
  }
}

module.exports = {
  removeUserSession,
  addActiveUserSession,
  removeActiveUserSession,
};
