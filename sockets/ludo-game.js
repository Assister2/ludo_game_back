const challengeHelper = require("../helpers/challengeHelper");

const ludoGame = (socket) => {
  socket.on("ludogame", async (message) => {
    try {
      const data = JSON.parse(message);
      switch (data.type) {
        case "getChallengeByChallengeId":
          try {
            let challenge = await challengeHelper.getChallengeById(
              data.payload.challengeId
            );
            if (challenge.player._id && challenge.creator._id) {
              if (challenge.state != "playing" && challenge.state != "hold") {
                return socket.emit(
                  "ludogame",
                  JSON.stringify({
                    status: 400,
                    error: "Challenge not found",
                    data: null,
                  })
                );
              }
              if (
                challenge.creator._id == data.payload.userId ||
                challenge.player._id == data.payload.userId
              ) {
                if (challenge.player._id == data.payload.userId)
                  await challengeHelper.updateChallengeById({
                    _id: challenge._id,
                    firstTime: false,
                  });

                if (challenge.state == "hold")
                  return socket.emit(
                    "ludogame",
                    JSON.stringify({
                      status: 400,
                      error: "Challenge is on hold",
                      data: null,
                    })
                  );

                if (
                  challenge.creator._id == data.payload.userId &&
                  challenge.results.creator.result !== ""
                )
                  return socket.emit(
                    "ludogame",
                    JSON.stringify({
                      status: 400,
                      error: "Challenge is on hold",
                      data: null,
                    })
                  );

                if (
                  challenge.player._id == data.payload.userId &&
                  challenge.results.player.result !== ""
                )
                  return socket.emit(
                    "ludogame",
                    JSON.stringify({
                      status: 400,
                      error: "Challenge is on hold",
                      data: null,
                    })
                  );

                return socket.emit(
                  "ludogame",
                  JSON.stringify({ status: 200, error: null, data: challenge })
                );
              }

              return socket.emit(
                "ludogame",
                JSON.stringify({
                  status: 400,
                  error: "Not Authorized",
                  data: null,
                })
              );
            } else {
              return socket.emit(
                "ludogame",
                JSON.stringify({
                  status: 400,
                  error: " challenge not Foundd",
                  data: null,
                })
              );
            }
          } catch (error) {
            return socket.emit(
              "ludogame",
              JSON.stringify({ status: 400, error: error.message, data: null })
            );
          }
      }
    } catch (error) {
      return socket.emit(
        "ludogame",
        JSON.stringify({ status: 400, error: error, data: null })
      );
    }
  });
};

module.exports = ludoGame;
