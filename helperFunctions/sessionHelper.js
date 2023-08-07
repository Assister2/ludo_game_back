// sessionHelper.js

const userSockets = require("../allSocketConnection");

async function removeAllUserSessions(sessionStore, userId) {
  try {
    console.log("workingtimee");
    const sessions = await new Promise((resolve, reject) => {
      sessionStore.all((err, sessions) => {
        if (err) {
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
    if (activeSessions.length > 0) {
      if (userSockets.has(userId.toString())) {
        const lastSocketConn = userSockets.get(userId.toString());
        lastSocketConn.emit("logout", {});
        lastSocketConn.disconnect();
        userSockets.delete(userId.toString());
      }
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
