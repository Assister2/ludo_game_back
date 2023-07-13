const dotenv = require("dotenv");
const mongoose = require("mongoose");
const express = require("express");

const {
  startGame,
  cancelChallenge,
  bothResultNotUpdated,
} = require("./function.js");

const accountController = require("./controllers/accounts");
const challengesController = require("./controllers/challenges");

// 30 seconds

// const { sendFCM } = require("./routes/notification");
dotenv.config();
const app2 = express();
function handleConnection(socket) {
  const HEARTBEAT_INTERVAL = 30000;
  // io.emit("Sent a message 4seconds after connection!");
  socket.on("getUserWallet", async (message) => {
    try {
      const data = JSON.parse(message);

      let response = {
        status: 200,
        data: null,
        error: null,
      };

      const connections = {};
      const userId = data.payload.userId;
      connections[userId] = socket;

      switch (data.type) {
        case "getUserWallet":
          try {
            let wallet = await accountController.getAccountByUserId(
              data.payload.userId
            );

            socket.emit(
              "getUserWallet",
              JSON.stringify({
                ...response,
                status: 200,
                error: null,
                data: wallet,
              })
            );
          } catch (error) {
            response = {
              ...response,
              status: 400,
              error: error.message,
              data: null,
            };
            console.log("cehckkerr,", response);

            return socket.emit("getUserWallet", JSON.stringify(response));
          }
        // case "updatePlayersWallet":
        //   try {
        //     let challenge = await challengesController.getChallengeById(
        //       data.payload.challengeId
        //     );
        //     if (!challenge) {
        //       response = {
        //         ...response,
        //         status: 400,
        //         error: data.payload,
        //         data: null,
        //       };
        //       console.log("testttt", response);
        //       return socket.emit("getUserWallet", JSON.stringify(response));
        //     }
        //     let playerWallet = await accountController.getAccountByUserId(
        //       challenge.player._id
        //     );
        //     let creatorWallet = await accountController.getAccountByUserId(
        //       challenge.creator._id
        //     );
        //     if (challenge) {
        //       console.log("-------coming here ---------");
        //       if (connections.get(data.payload.creatorId) !== undefined) {
        //         let connection = connections.get(data.payload.creatorId);
        //         let creatorResponse = {
        //           ...response,
        //           status: 200,
        //           error: null,
        //           data: creatorWallet,
        //         };
        //         console.log("working creator");
        //         connection.send(JSON.stringify(creatorResponse));
        //       }
        //       if (connections.get(data.payload.playerId) !== undefined) {
        //         console.log("working player");
        //         let connection = connections.get(data.payload.playerId);
        //         let playerResponse = {
        //           ...response,
        //           status: 200,
        //           error: null,
        //           data: playerWallet,
        //         };
        //         connection.send(JSON.stringify(playerResponse));
        //       }
        //       connections.set(`guide${data.payload.playerId}`, socket);
        //       if (
        //         connections.get(`guide${data.payload.playerId}`) !== undefined
        //       ) {
        //         console.log("working player guide");
        //         let connection = connections.get(
        //           `guide${data.payload.playerId}`
        //         );
        //         let playerResponse = {
        //           ...response,
        //           status: 200,
        //           error: null,
        //           data: playerWallet,
        //         };
        //         connection.send(JSON.stringify(playerResponse));
        //       }
        //     }
        //     // sendDataToUser(challenge.player?._id, playerResponse)
        //     // sendDataToUser(challenge.creator._id, creatorResponse)
        //     // return socket.send(JSON.stringify(response));
        //     return;
        //   } catch (error) {
        //     console.log("error.message2", error.message);
        //     response = { status: 400, error: error.message, data: null };
        //     return socket.send(JSON.stringify(response));
        //   }
      }
    } catch (error) {
      console.log("Errorwa233", error.message);
      let response = { status: 400, error: error, data: null };
      console.log("ssss", response);
      return socket.send(JSON.stringify(response));
    }
    // Parse the incoming message as JSON
  });
  //todo:game
  socket.on("ludogame", async (message) => {
    try {
      const data = JSON.parse(message);

      let userId = "";
      let response = {
        status: 200,
        data: null,
        error: null,
      };
      switch (data.type) {
        case "getChallengeByChallengeId":
          try {
            let challenge = await challengesController.getChallengeById(
              data.payload.challengeId
            );
            if (challenge.player._id && challenge.creator._id) {
              // if (!challenge) {
              //   response = {
              //     ...response,
              //     status: 400,
              //     error: "Challenge not found",
              //     data: null,
              //   };
              //   return socket.emit("ludogame", JSON.stringify(response));
              // }
              if (challenge.state != "playing" && challenge.state != "hold") {
                response = {
                  ...response,
                  status: 400,
                  error: "Challenge not found",
                  data: null,
                };
                return socket.emit("ludogame", JSON.stringify(response));
              }
              if (
                challenge.creator._id == data.payload.userId ||
                challenge.player._id == data.payload.userId
              ) {
                if (challenge.player._id == data.payload.userId) {
                  await challengesController.updateChallengeById({
                    _id: challenge._id,
                    firstTime: false,
                  });
                }
                if (challenge.state == "hold") {
                  response = {
                    status: 400,
                    error: "Challenge is on hold",
                    data: null,
                  };
                  return socket.emit("ludogame", JSON.stringify(response));
                }
                if (
                  challenge.creator._id == data.payload.userId &&
                  challenge.results.creator.result !== ""
                ) {
                  response = {
                    status: 400,
                    error: "Challenge is on hold",
                    data: null,
                  };
                  return socket.emit("ludogame", JSON.stringify(response));
                }
                if (
                  challenge.player._id == data.payload.userId &&
                  challenge.results.player.result !== ""
                ) {
                  response = {
                    status: 400,
                    error: "Challenge is on hold",
                    data: null,
                  };
                  return socket.emit("ludogame", JSON.stringify(response));
                }
                response = {
                  ...response,
                  status: 200,
                  error: null,
                  data: challenge,
                };

                return socket.emit("ludogame", JSON.stringify(response));
              }
              response = {
                ...response,
                status: 400,
                error: "Not Authorized",
                data: null,
              };
              return socket.emit("ludogame", JSON.stringify(response));
            } else {
              response = {
                ...response,
                status: 400,
                error: " challenge not Foundd",
                data: null,
              };
              return socket.emit("ludogame", JSON.stringify(response));
            }
          } catch (error) {
            console.log("error.message3", error.message);
            response = {
              ...response,
              status: 400,
              error: error.message,
              data: null,
            };
            return socket.emit("ludogame", JSON.stringify(response));
          }
      }
    } catch (error) {
      console.log("Errorwa3", error.message);
      response = { ...response, status: 400, error: error, data: null };
      return socket.emit("ludogame", JSON.stringify(response));
    }
    // Parse the incoming message as JSON
  });

  //todo:play
  try {
    console.log("connected");
    socket.send(JSON.stringify({ type: "heartbeat" }));
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.send(JSON.stringify({ type: "heartbeat" }));
      } else {
        clearInterval(heartbeatInterval);
      }
    }, HEARTBEAT_INTERVAL);

    socket.on("message", async (message) => {
      try {
        const data = JSON.parse(message);
        // console.log("testdata", data);
        let userId = "";
        let response = {
          status: 200,
          data: null,
          error: null,
        };

        if (data.type) {
          switch (data.type) {
            case "create":
              let userWallet = await accountController.getAccountByUserId(
                data.payload.userId
              );
              if (userWallet.wallet - data.payload.amount < 0) {
                response = {
                  ...response,
                  status: 400,
                  error: "You dont have enough chips",
                  data: null,
                };
                return socket.send(JSON.stringify(response));
              }
              let checkChallenge =
                await challengesController.checkChallengeLimit(
                  data.payload.userId
                );
              if (checkChallenge) {
                response = {
                  ...response,
                  status: 400,
                  error: "You can Set Maximum 3 Challenges at Once",
                  data: null,
                };
                return socket.send(JSON.stringify(response));
              }
              let sameAmountChallenge =
                await challengesController.checkSameAmountChallenge({
                  userId: data.payload.userId,
                  amount: data.payload.amount,
                });
              if (sameAmountChallenge.length > 0) {
                response = {
                  ...response,
                  status: 400,
                  error: "Same Amount Challenge already exist",
                  data: null,
                };
                console.log("checkerror", response);
                return socket.send(JSON.stringify(response));
              }
              let checkPlayingOrHold =
                await challengesController.checkPlayingOrHold(
                  data.payload.userId
                );

              if (!checkPlayingOrHold) {
                response = {
                  ...response,
                  status: 400,
                  error: "Update Your Result In Previous Match First",
                  data: null,
                };
                return socket.send(JSON.stringify(response));
              }
              // var config = {
              //   method: "get",
              //   url: "  http://128.199.28.12:3000/ludoking/roomcode",
              //   // url: "http://43.205.124.118/ludoking/roomcode/",
              //   headers: {},
              // };

              // let roomCodeResponse = await axios(config);
              let challenge = {
                creator: data.payload.userId,
                amount: data.payload.amount,
                // roomCode: roomCodeResponse.data,
                createdAt: new Date(),
              };

              challenge = await challengesController.createChallenge(challenge);
              // if (challenge) {
              //   socket.send(JSON.stringify({ status: 2 }));

              //   let challenges = await challengesController.getAllChallenges();
              //   return socket.send(JSON.stringify(challenges));
              // }
              if (!challenge) {
                response = {
                  ...response,
                  status: 400,
                  error: "challenge not created2",
                  data: null,
                };
                return socket.send(JSON.stringify(response));
              }
              socket.send(JSON.stringify({ status: 2 }));
              break;
            case "play":
              const session = await mongoose.startSession();

              session.startTransaction();
              let currentChallenge =
                await challengesController.getChallengeByChallengeId(
                  data.payload.challengeId
                );

              try {
                if (currentChallenge.state === "requested") {
                  response = {
                    ...response,
                    status: 400,
                    error: "Request Cancelled",
                    data: null,
                  };
                  return socket.send(JSON.stringify(response));
                }

                let playerWallet = await accountController.getAccountByUserId(
                  data.payload.userId
                );

                if (playerWallet.wallet - currentChallenge.amount < 0) {
                  response = {
                    ...response,
                    status: 400,
                    error: "You don't have enough chips",
                    data: null,
                  };
                  return socket.send(JSON.stringify(response));
                }

                let checkRequestedChallenges =
                  await challengesController.checkAlreadyRequestedGame(
                    data.payload.userId
                  );

                if (checkRequestedChallenges.length > 0) {
                  response = {
                    ...response,
                    status: 400,
                    error: "You have already requested a game",
                    data: null,
                  };
                  return socket.send(JSON.stringify(response));
                }

                let checkPlayingOrHoldGame =
                  await challengesController.checkPlayingOrHold(
                    data.payload.userId
                  );

                if (!checkPlayingOrHoldGame) {
                  response = {
                    ...response,
                    status: 400,
                    error: "Update Your Result In Previous Match First",
                    data: null,
                  };
                  return socket.send(JSON.stringify(response));
                }
                if (!currentChallenge) {
                  response = {
                    ...response,
                    status: 400,
                    error: "Challenge not created",
                    data: null,
                  };
                  return socket.send(JSON.stringify(response));
                }

                currentChallenge =
                  await challengesController.updateChallengeById44(
                    currentChallenge._id,
                    data.payload.userId,
                    session
                  );
                await session.commitTransaction();
                session.endSession();
                socket.send(JSON.stringify({ status: 4 }));
                if (!currentChallenge) {
                  response = {
                    ...response,
                    status: 400,
                    error: "Challenge not created",
                    data: null,
                  };
                  return socket.send(JSON.stringify(response));
                }
              } catch (error) {
                await session.abortTransaction();
                session.endSession();
                console.log("PlayCatcherror", error);
                throw error;
              } finally {
                socket.send(JSON.stringify({ status: 444 }));
              }

              // Implement your read operation here
              break;
            case "cancel":
              await challengesController.updateChallengeById23(
                data.payload.challengeId
              );
              socket.send(JSON.stringify({ status: 333 }));
              break;
            case "delete":
              await challengesController.updateDeleteChallengeById(
                data.payload.challengeId
              );
              socket.send(JSON.stringify({ status: 222 }));

              break;

            case "deleteOpenChallengesOfCreator":
              console.log("seleted too");
              // await challengesController.deleteOpenChallengesCreator(
              //   data.payload.userId
              // );
              await challengesController.deleteOpenChallenges(
                data.payload.userId
              );
              // await challengesController.cancelRequestedChallenges2(
              //   data.payload.userId
              // );
              break;
            case "startGame":
              await startGame(data, socket);
              socket.send(JSON.stringify({ status: 111 }));
              await bothResultNotUpdated(data.payload.challengeId);
              break;
          }
        }

        // });
        let challenges = await challengesController.getAllChallenges();

        socket.send(JSON.stringify(challenges));
      } catch (error) {
        console.log("errorwa3", error);
      }
    });
    socket.on("close", (code, reason) => {
      console.log("WebSocket connection closed:", code, reason);
      clearInterval(heartbeatInterval);
    });
  } catch (error) {
    console.log("error", error);
  }
}
module.exports = handleConnection;
