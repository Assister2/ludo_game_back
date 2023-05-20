const dotenv = require("dotenv");
const mongoose = require("mongoose");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const http = require("http");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const transactionRouter = require("./routes/transactions");
const challengesRouter = require("./routes/challenge");
const historyRouter = require("./routes/history");
// const app = express();
const expressWebSocket = require("express-ws");
const verifyTokenSocket = require("./services/verifyTokenSocket");
const { existingUserById } = require("./controllers/user");
const accountController = require("./controllers/accounts");
const challengesController = require("./controllers/challenges");
const userController = require("./controllers/user");
const { generate } = require("./helpers");
const Challenge = require("./models/challenges");
const UserAccount = require("./models/accounts");
const transactionsController = require("./controllers/transactions");
const expressWs = expressWebSocket(express());
const axios = require("axios");
const bodyParser = require("body-parser");
const app = expressWs.app;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const WebSocket = require("ws");
// const { sendFCM } = require("./routes/notification");
dotenv.config();
const app2 = express();
mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() => console.log("db is connected"))
  .catch((error) => console.log(error.message));
const server = app2.listen(4002, () => {
  console.log("socket is running on port 4002");
});
app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "ludo-frontend.vercel.app");
  next();
});
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);
app.use("/api/auth", authRouter);
app.use(express.json({ limit: "50mb" }));
app.use("/api/user", userRouter);
app.use("/api/transaction", transactionRouter);
app.use("/api/challenges", challengesRouter);
app.use("/api/history", historyRouter);
// const server = app2.listen(process.env.PORT || 5000, () => {
//   console.log(`\nServer is UP on PORT ${process.env.SERVER_PORT}`);
//   console.log(`Visit  `(`localhost:${5000}`));
// });

const io = require("socket.io")(server, {
  pingTimeout: 1000,
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
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

            return socket.emit("getUserWallet", JSON.stringify(response));
          }
        case "updatePlayersWallet":
          try {
            let challenge = await challengesController.getChallengeById(
              data.payload.challengeId
            );
            if (!challenge) {
              response = {
                ...response,
                status: 400,
                error: data.payload,
                data: null,
              };
              // console.log("testttt", response);
              return socket.emit("getUserWallet", JSON.stringify(response));
            }
            let playerWallet = await accountController.getAccountByUserId(
              challenge.player._id
            );
            let creatorWallet = await accountController.getAccountByUserId(
              challenge.creator._id
            );
            if (challenge) {
              console.log("-------coming here ---------");
              if (connections.get(data.payload.creatorId) !== undefined) {
                let connection = connections.get(data.payload.creatorId);
                let creatorResponse = {
                  ...response,
                  status: 200,
                  error: null,
                  data: creatorWallet,
                };
                console.log("working creator");
                connection.send(JSON.stringify(creatorResponse));
              }
              if (connections.get(data.payload.playerId) !== undefined) {
                console.log("working player");
                let connection = connections.get(data.payload.playerId);
                let playerResponse = {
                  ...response,
                  status: 200,
                  error: null,
                  data: playerWallet,
                };
                connection.send(JSON.stringify(playerResponse));
              }
              connections.set(`guide${data.payload.playerId}`, socket);
              if (
                connections.get(`guide${data.payload.playerId}`) !== undefined
              ) {
                console.log("working player guide");
                let connection = connections.get(
                  `guide${data.payload.playerId}`
                );
                let playerResponse = {
                  ...response,
                  status: 200,
                  error: null,
                  data: playerWallet,
                };
                connection.send(JSON.stringify(playerResponse));
              }
            }
            // sendDataToUser(challenge.player._id, playerResponse)
            // sendDataToUser(challenge.creator._id, creatorResponse)
            // return socket.send(JSON.stringify(response));
            return;
          } catch (error) {
            console.log("error.message", error.message);
            response = { status: 400, error: error.message, data: null };
            return socket.send(JSON.stringify(response));
          }
      }
    } catch (error) {
      console.log("Errorwa2", error.message);
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
            if (!challenge) {
              response = {
                ...response,
                status: 400,
                error: "Challenge not found",
                data: null,
              };
              return socket.emit("ludogame", JSON.stringify(response));
            }
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
              response = {
                ...response,
                status: 200,
                error: null,
                data: challenge,
              };
              if (challenge.player._id == data.payload.userId) {
                await challengesController.updateChallengeById({
                  _id: challenge._id,
                  firstTime: false,
                });
              }
              return socket.emit("ludogame", JSON.stringify(response));
            }
            response = {
              ...response,
              status: 400,
              error: "Not Authorized",
              data: null,
            };
            return socket.emit("ludogame", JSON.stringify(response));
          } catch (error) {
            console.log("error.message", error.message);
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
    var aWss = expressWs.getWss("/playpage");
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
                return socket.send(JSON.stringify(response));
              }
              let checkPlayingOrHold =
                await challengesController.checkPlayingOrHold(
                  data.payload.userId
                );
              if (checkPlayingOrHold.length > 0) {
                response = {
                  ...response,
                  status: 400,
                  error: "Update Your Result In Previous Match First2",
                  data: null,
                };
                return socket.send(JSON.stringify(response));
              }
              var config = {
                method: "get",
                url: "http://64.227.158.9:3000/ludoking/roomcode/",
                headers: {},
              };

              let roomCodeResponse = await axios(config);
              let challenge = {
                creator: data.payload.userId,
                amount: data.payload.amount,
                roomCode: roomCodeResponse.data,
                createdAt: new Date(),
              };

              challenge = await challengesController.createChallenge(challenge);
              if (!!challenge) {
                let challenges = await challengesController.getAllChallenges();

                // console.log("challengess", challenges);

                // aWss.clients.forEach(function (client) {

                socket.send(JSON.stringify(challenges));
              }

              if (!challenge) {
                response = {
                  ...response,
                  status: 400,
                  error: "challenge not created",
                  data: null,
                };
                return socket.send(JSON.stringify(response));
              }
              let user = await userController.existingUserById({
                id: data.payload.userId,
              });
              // await sendFCM(data.payload.amount, user.username);
              await userController.updateUserByUserId({
                _id: data.payload.userId,
                hasActiveChallenge: true,
              });
              await challengesController.updateChallengeById({
                _id: data.payload.challengeId,
                state: "playing",
              });
              // Implement your create operation here
              break;
            case "play":
              let currentChallenge =
                await challengesController.getChallengeByChallengeId(
                  data.payload.challengeId
                );
              if (currentChallenge.state == "requested") {
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
                  error: "You dont have enough chips",
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
                  error: "you have already requested a game",
                  data: null,
                };
                return socket.send(JSON.stringify(response));
              }
              let checkPlayingOrHoldGame =
                await challengesController.checkPlayingOrHold(
                  data.payload.userId
                );
              if (checkPlayingOrHoldGame.length > 0) {
                response = {
                  ...response,
                  status: 400,
                  error: "Update Your Result In Previous Match First",
                  data: null,
                };
                return socket.send(JSON.stringify(response));
              }
              currentChallenge._doc.state = "requested";
              currentChallenge._doc.player = data.payload.userId;
              currentChallenge = await challengesController.updateChallengeById(
                currentChallenge
              );
              if (!currentChallenge) {
                response = {
                  ...response,
                  status: 400,
                  error: "challenge not created",
                  data: null,
                };
                return socket.send(JSON.stringify(response));
              }
              const reap = await userController.updateUserByUserId({
                _id: data.payload.userId,
                hasActiveChallenge: true,
              });
              console.log("resp", reap);

              // Implement your read operation here
              break;
            case "cancel":
              let cancelChallenge = {
                _id: data.payload.challengeId,
                player: null,
                state: "open",
              };
              let canecelledChallenge =
                await challengesController.updateChallengeById(cancelChallenge);
              if (!canecelledChallenge) {
                response = {
                  ...response,
                  status: 400,
                  error: "challenge not created",
                  data: null,
                };
                return socket.send(JSON.stringify(response));
              }
              await userController.updateUserByUserId({
                _id: data.payload.userId,
                hasActiveChallenge: false,
              });
              // Implement your update operation here
              break;
            case "delete":
              let challengeObj = {
                _id: data.payload.challengeId,
                status: 0,
              };
              let deletedChallenge =
                await challengesController.updateChallengeById(challengeObj);
              if (deletedChallenge) {
                let challenges = await challengesController.getAllChallenges();

                socket.send(JSON.stringify(challenges));
              } else {
                response = {
                  ...response,
                  status: 400,
                  error: "Challenge not found",
                  data: null,
                };
                return socket.send(JSON.stringify(response));
              }

              await userController.updateUserByUserId({
                _id: data.payload.userId,
                hasActiveChallenge: false,
              });
              break;
            case "cancelRequestedOnPageChange":
              console.log("cancel working");
              await challengesController.cancelRequestedChallengesByPlayerId(
                data.payload.userId
              );
              await userController.updateUserByUserId({
                _id: data.payload.userId,
                hasActiveChallenge: false,
              });
              break;
            case "deleteOpenChallengesOfCreator":
              console.log("seleted too");
              await challengesController.deleteOpenChallengesCreator(
                data.payload.userId
              );
              await userController.updateUserByUserId({
                _id: data.payload.userId,
                hasActiveChallenge: false,
              });
              break;
            case "startGame":
              let startChallenge = await challengesController.getChallengeById(
                data.payload.challengeId
              );
              if (startChallenge) {
                await challengesController.deleteOpenChallengesCreator(
                  startChallenge.creator._id
                );
                await challengesController.deleteOpenChallengesCreator(
                  startChallenge.player._id
                );
              }

              let startGameChallenge =
                await challengesController.updateChallengeById({
                  _id: data.payload.challengeId,
                  state: "playing",
                });
              if (startGameChallenge) {
                await challengesController.deleteRequestedChallenges(
                  startChallenge.creator._id
                );
                await challengesController.cancelRequestedChallenges(
                  startChallenge.creator._id
                );
                await challengesController.deleteRequestedChallenges(
                  startChallenge.player._id
                );
                await accountController.decreasePlayersAccount(startChallenge);
                await userController.updateUserByUserId({
                  _id: data.payload.userId,
                  hasActiveChallenge: false,
                });
              }
              if (!startGameChallenge) {
                response = {
                  ...response,
                  status: 400,
                  error: "Challenge not found",
                  data: null,
                };
                return socket.send(JSON.stringify(response));
              }

              response = {
                ...response,
                status: 200,
                error: null,
                data: null,
                challengeRedirect: true,
                challengeId: startGameChallenge._id,
              };
              socket.send(JSON.stringify(response));
          }
        }

        //   socket.send(JSON.stringify(data))

        // });
        let challenges = await challengesController.getAllChallenges();

        // console.log("challengess", challenges);

        // aWss.clients.forEach(function (client) {
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
});
// app.ws("/playpage", (ws, req) => {
//   try {
//     console.log("connected");
//     ws.send(JSON.stringify({ type: "heartbeat" }));
//     const heartbeatInterval = setInterval(() => {
//       if (ws.readyState === WebSocket.OPEN) {
//         ws.send(JSON.stringify({ type: "heartbeat" }));
//       } else {
//         clearInterval(heartbeatInterval);
//       }
//     }, HEARTBEAT_INTERVAL);
//     var aWss = expressWs.getWss("/playpage");
//     ws.on("message", async (message) => {
//       try {
//         const data = JSON.parse(message);
//         let userId = "";
//         let response = {
//           status: 200,
//           data: null,
//           error: null,
//         };
//         switch (data.type) {
//           case "create":
//             let userWallet = await accountController.getAccountByUserId(
//               data.payload.userId
//             );
//             if (userWallet.wallet - data.payload.amount < 0) {
//               response = {
//                 ...response,
//                 status: 400,
//                 error: "You dont have enough chips",
//                 data: null,
//               };
//               return ws.send(JSON.stringify(response));
//             }
//             let checkChallenge = await challengesController.checkChallengeLimit(
//               data.payload.userId
//             );
//             if (checkChallenge) {
//               response = {
//                 ...response,
//                 status: 400,
//                 error: "You can Set Maximum 3 Challenges at Once",
//                 data: null,
//               };
//               return ws.send(JSON.stringify(response));
//             }
//             let sameAmountChallenge =
//               await challengesController.checkSameAmountChallenge({
//                 userId: data.payload.userId,
//                 amount: data.payload.amount,
//               });
//             if (sameAmountChallenge.length > 0) {
//               response = {
//                 ...response,
//                 status: 400,
//                 error: "Same Amount Challenge already exist",
//                 data: null,
//               };
//               return ws.send(JSON.stringify(response));
//             }
//             let checkPlayingOrHold =
//               await challengesController.checkPlayingOrHold(
//                 data.payload.userId
//               );
//             if (checkPlayingOrHold.length > 0) {
//               response = {
//                 ...response,
//                 status: 400,
//                 error: "Update Your Result In Previous Match First",
//                 data: null,
//               };
//               return ws.send(JSON.stringify(response));
//             }
//             var config = {
//               method: "get",
//               url: "http://64.227.158.9:3000/ludoking/roomcode/",
//               headers: {},
//             };

//             let roomCodeResponse = await axios(config);
//             let challenge = {
//               creator: data.payload.userId,
//               amount: data.payload.amount,
//               roomCode: roomCodeResponse.data,
//               createdAt: new Date(),
//             };
//             challenge = await challengesController.createChallenge(challenge);

//             if (!challenge) {
//               response = {
//                 ...response,
//                 status: 400,
//                 error: "challenge not created",
//                 data: null,
//               };
//               return ws.send(JSON.stringify(response));
//             }
//             let user = await userController.existingUserById({
//               id: data.payload.userId,
//             });
//             await sendFCM(data.payload.amount, user.username);
//             await userController.updateUserByUserId({
//               _id: data.payload.userId,
//               hasActiveChallenge: true,
//             });
//             await challengesController.updateChallengeById({
//               _id: data.payload.challengeId,
//               state: "playing",
//             });
//             // Implement your create operation here
//             break;
//           case "play":
//             let currentChallenge =
//               await challengesController.getChallengeByChallengeId(
//                 data.payload.challengeId
//               );
//             if (currentChallenge.state == "requested") {
//               response = {
//                 ...response,
//                 status: 400,
//                 error: "Request Cancelled",
//                 data: null,
//               };
//               return ws.send(JSON.stringify(response));
//             }
//             let playerWallet = await accountController.getAccountByUserId(
//               data.payload.userId
//             );
//             if (playerWallet.wallet - currentChallenge.amount < 0) {
//               response = {
//                 ...response,
//                 status: 400,
//                 error: "You dont have enough chips",
//                 data: null,
//               };
//               return ws.send(JSON.stringify(response));
//             }
//             let checkRequestedChallenges =
//               await challengesController.checkAlreadyRequestedGame(
//                 data.payload.userId
//               );
//             if (checkRequestedChallenges.length > 0) {
//               response = {
//                 ...response,
//                 status: 400,
//                 error: "you have already requested a game",
//                 data: null,
//               };
//               return ws.send(JSON.stringify(response));
//             }
//             let checkPlayingOrHoldGame =
//               await challengesController.checkPlayingOrHold(
//                 data.payload.userId
//               );
//             if (checkPlayingOrHoldGame.length > 0) {
//               response = {
//                 ...response,
//                 status: 400,
//                 error: "Update Your Result In Previous Match First",
//                 data: null,
//               };
//               return ws.send(JSON.stringify(response));
//             }
//             currentChallenge._doc.state = "requested";
//             currentChallenge._doc.player = data.payload.userId;
//             currentChallenge = await challengesController.updateChallengeById(
//               currentChallenge
//             );
//             if (!currentChallenge) {
//               response = {
//                 ...response,
//                 status: 400,
//                 error: "challenge not created",
//                 data: null,
//               };
//               return ws.send(JSON.stringify(response));
//             }
//             const reap = await userController.updateUserByUserId({
//               _id: data.payload.userId,
//               hasActiveChallenge: true,
//             });
//             console.log("resp", reap);

//             // Implement your read operation here
//             break;
//           case "cancel":
//             let cancelChallenge = {
//               _id: data.payload.challengeId,
//               player: null,
//               state: "open",
//             };
//             let canecelledChallenge =
//               await challengesController.updateChallengeById(cancelChallenge);
//             if (!canecelledChallenge) {
//               response = {
//                 ...response,
//                 status: 400,
//                 error: "challenge not created",
//                 data: null,
//               };
//               return ws.send(JSON.stringify(response));
//             }
//             await userController.updateUserByUserId({
//               _id: data.payload.userId,
//               hasActiveChallenge: false,
//             });
//             // Implement your update operation here
//             break;
//           case "delete":
//             let challengeObj = {
//               _id: data.payload.challengeId,
//               status: 0,
//             };
//             let deletedChallenge =
//               await challengesController.updateChallengeById(challengeObj);
//             if (!deletedChallenge) {
//               response = {
//                 ...response,
//                 status: 400,
//                 error: "Challenge not found",
//                 data: null,
//               };
//               return ws.send(JSON.stringify(response));
//             }
//             await userController.updateUserByUserId({
//               _id: data.payload.userId,
//               hasActiveChallenge: false,
//             });
//             break;
//           case "cancelRequestedOnPageChange":
//             console.log("cancel working");
//             await challengesController.cancelRequestedChallengesByPlayerId(
//               data.payload.userId
//             );
//             await userController.updateUserByUserId({
//               _id: data.payload.userId,
//               hasActiveChallenge: false,
//             });
//             break;
//           case "deleteOpenChallengesOfCreator":
//             console.log("seleted too");
//             await challengesController.deleteOpenChallengesCreator(
//               data.payload.userId
//             );
//             await userController.updateUserByUserId({
//               _id: data.payload.userId,
//               hasActiveChallenge: false,
//             });
//             break;
//           case "startGame":
//             let startChallenge = await challengesController.getChallengeById(
//               data.payload.challengeId
//             );
//             if (startChallenge) {
//               await challengesController.deleteOpenChallengesCreator(
//                 startChallenge.creator._id
//               );
//               await challengesController.deleteOpenChallengesCreator(
//                 startChallenge.player._id
//               );
//             }

//             let startGameChallenge =
//               await challengesController.updateChallengeById({
//                 _id: data.payload.challengeId,
//                 state: "playing",
//               });
//             if (startGameChallenge) {
//               await challengesController.deleteRequestedChallenges(
//                 startChallenge.creator._id
//               );
//               await challengesController.cancelRequestedChallenges(
//                 startChallenge.creator._id
//               );
//               await challengesController.deleteRequestedChallenges(
//                 startChallenge.player._id
//               );
//               await accountController.decreasePlayersAccount(startChallenge);
//               await userController.updateUserByUserId({
//                 _id: data.payload.userId,
//                 hasActiveChallenge: false,
//               });
//             }
//             if (!startGameChallenge) {
//               response = {
//                 ...response,
//                 status: 400,
//                 error: "Challenge not found",
//                 data: null,
//               };
//               return ws.send(JSON.stringify(response));
//             }

//             response = {
//               ...response,
//               status: 200,
//               error: null,
//               data: null,
//               challengeRedirect: true,
//               challengeId: startGameChallenge._id,
//             };
//             ws.send(JSON.stringify(response));
//         }

//         //   ws.send(JSON.stringify(data))
//         let challenges = await challengesController.getAllChallenges();

//         aWss.clients.forEach(function (client) {
//           client.send(JSON.stringify(challenges));
//         });
//       } catch (error) {
//         console.log("errorwa", error);
//       }
//     });
//     ws.on("close", (code, reason) => {
//       console.log("WebSocket connection closed:", code, reason);
//       clearInterval(heartbeatInterval);
//     });
//   } catch (error) {
//     console.log("error", error);
//   }
// });

app.ws("/game", (ws, req) => {
  ws.send(JSON.stringify({ type: "heartbeat" }));

  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "heartbeat" }));
    } else {
      clearInterval(heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL);

  ws.on("message", async (message) => {
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
            if (!challenge) {
              response = {
                ...response,
                status: 400,
                error: "Challenge not found",
                data: null,
              };
              return ws.send(JSON.stringify(response));
            }
            if (challenge.state != "playing" && challenge.state != "hold") {
              response = {
                ...response,
                status: 400,
                error: "Challenge not found",
                data: null,
              };
              return ws.send(JSON.stringify(response));
            }
            if (
              challenge.creator._id == data.payload.userId ||
              challenge.player._id == data.payload.userId
            ) {
              response = {
                ...response,
                status: 200,
                error: null,
                data: challenge,
              };
              if (challenge.player._id == data.payload.userId) {
                await challengesController.updateChallengeById({
                  _id: challenge._id,
                  firstTime: false,
                });
              }
              return ws.send(JSON.stringify(response));
            }
            response = {
              ...response,
              status: 400,
              error: "Not Authorized",
              data: null,
            };
            return ws.send(JSON.stringify(response));
          } catch (error) {
            console.log("error.message", error.message);
            response = {
              ...response,
              status: 400,
              error: error.message,
              data: null,
            };
            return ws.send(JSON.stringify(response));
          }
      }
    } catch (error) {
      console.log("Errorwa", error.message);
      response = { ...response, status: 400, error: error, data: null };
      return ws.send(JSON.stringify(response));
    }
    // Parse the incoming message as JSON
  });

  ws.on("close", (code, reason) => {
    console.log("WebSocket connection closed:", code, reason);
    clearInterval(heartbeatInterval);
  });
});

// app.ws("/wallet", (ws, req) => {
//   ws.on("message", async (message) => {
//     try {
//       const data = JSON.parse(message);
//       let response = {
//         status: 200,
//         data: null,
//         error: null,
//       };
//       const connections = {};
//       const userId = data.payload.userId;
//       connections[userId] = ws;
//       switch (data.type) {
//         case "getUserWallet":
//           try {
//             let wallet = await accountController.getAccountByUserId(
//               data.payload.userId
//             );
//             ws.send(
//               JSON.stringify({
//                 ...response,
//                 status: 200,
//                 error: null,
//                 data: wallet,
//               })
//             );
//           } catch (error) {
//             response = {
//               ...response,
//               status: 400,
//               error: error.message,
//               data: null,
//             };
//             return ws.send(JSON.stringify(response));
//           }
//         case "updatePlayersWallet":
//           try {
//             let challenge = await challengesController.getChallengeById(
//               data.payload.challengeId
//             );
//             if (!challenge) {
//               response = {
//                 ...response,
//                 status: 400,
//                 error: data.payload,
//                 data: null,
//               };
//               return ws.send(JSON.stringify(response));
//             }
//             let playerWallet = await accountController.getAccountByUserId(
//               challenge.player._id
//             );
//             let creatorWallet = await accountController.getAccountByUserId(
//               challenge.creator._id
//             );
//             if (challenge) {
//               console.log("-------coming here ---------");
//               if (connections.get(data.payload.creatorId) !== undefined) {
//                 let connection = connections.get(data.payload.creatorId);
//                 let creatorResponse = {
//                   ...response,
//                   status: 200,
//                   error: null,
//                   data: creatorWallet,
//                 };
//                 console.log("working creator");
//                 connection.send(JSON.stringify(creatorResponse));
//               }
//               if (connections.get(data.payload.playerId) !== undefined) {
//                 console.log("working player");
//                 let connection = connections.get(data.payload.playerId);
//                 let playerResponse = {
//                   ...response,
//                   status: 200,
//                   error: null,
//                   data: playerWallet,
//                 };
//                 connection.send(JSON.stringify(playerResponse));
//               }
//               connections.set(`guide${data.payload.playerId}`, ws);
//               if (
//                 connections.get(`guide${data.payload.playerId}`) !== undefined
//               ) {
//                 console.log("working player guide");
//                 let connection = connections.get(
//                   `guide${data.payload.playerId}`
//                 );
//                 let playerResponse = {
//                   ...response,
//                   status: 200,
//                   error: null,
//                   data: playerWallet,
//                 };
//                 connection.send(JSON.stringify(playerResponse));
//               }
//             }
//             // sendDataToUser(challenge.player._id, playerResponse)
//             // sendDataToUser(challenge.creator._id, creatorResponse)
//             // return ws.send(JSON.stringify(response));
//             return;
//           } catch (error) {
//             console.log("error.message", error.message);
//             response = { status: 400, error: error.message, data: null };
//             return ws.send(JSON.stringify(response));
//           }
//       }
//     } catch (error) {
//       console.log("Errorwa", error.message);
//       let response = { status: 400, error: error, data: null };
//       return ws.send(JSON.stringify(response));
//     }
//     // Parse the incoming message as JSON
//   });
// });
app.listen(4001, () => {
  console.log("application is running on port 4001");
});
module.exports = app;
