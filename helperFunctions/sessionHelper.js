// sessionHelper.js

const { client } = require("../allSocketConnection");
const socket = require("../socket");
async function removeAllUserSessions(sessionStore, userId, deleteId) {
  try {
    const io = socket.get();
    const sessions = await new Promise((resolve, reject) => {
      sessionStore.all((err, sessions) => {
        if (err) {
          console.log("session", err);
          reject(err);
        } else {
          resolve(sessions);
        }
      });
    });

    const activeSessions = sessions.filter(
      (session) =>
        session.session.user &&
        session.session.user._id &&
        session.session.user._id.equals(userId)
    );
    const lastSocket = await client.get(userId.toString());

    if (lastSocket) {
      const previousSocket = await io.sockets.sockets.get(lastSocket);

      if (previousSocket) {
        // Logout event
        previousSocket.emit("logout", {});
        previousSocket.disconnect(true);
      }

      client.del(userId.toString());
    }

    const sessionDestroyPromises = activeSessions.map((session) => {
      return new Promise((resolve, reject) => {
        sessionStore.destroy(session._id, (err) => {
          if (err) {
            console.error("Error destroying session:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
    await Promise.all(sessionDestroyPromises);
  } catch (error) {
    console.error("Error removing user sessions:", error);
  }
}

module.exports = {
  removeAllUserSessions,
};
