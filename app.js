const dotenv = require("dotenv");
const mongoose = require("mongoose");
const express = require("express");
const handleConnection = require("./socketHandler.js");
const path = require("path");
// import { startGame } from "./function.js";

const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");

// const app = express();
const expressWebSocket = require("express-ws");
const verifyTokenSocket = require("./services/verifyTokenSocket");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const transactionRouter = require("./routes/transactions");
const challengesRouter = require("./routes/challenge");
const historyRouter = require("./routes/history");
const accountController = require("./controllers/accounts");
const challengesController = require("./controllers/challenges");
const userController = require("./controllers/user");
const { generate } = require("./helpers");
const Challenge = require("./models/challenges");
const UserAccount = require("./models/accounts");
const { existingUserById } = require("./controllers/user");
const { startGame } = require("./function.js");
const http = require("http");
const io = require("socket.io");

const transactionsController = require("./controllers/transactions");
const expressWs = expressWebSocket(express());
const axios = require("axios");
const bodyParser = require("body-parser");
const app = express();
// 30 seconds

// const { sendFCM } = require("./routes/notification");
dotenv.config();
const app2 = express();
mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log("MongoDB connected");
    const server2 = app.listen(4001, () => {
      console.log("application and socket is running on port 4001");
    }); /* create your HTTP server */
    const socketServer = io(server2, {
      pingTimeout: 500,
      cors: {
        origin: "*",
      },
    });

    socketServer.on("connection", (socket) => {
      handleConnection(socket);
    });
  })
  .catch((error) => console.log(error.message));
// const server = app2.listen(4002, () => {
//   console.log("socket is running on port 4002");
// });

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

module.exports = app;
