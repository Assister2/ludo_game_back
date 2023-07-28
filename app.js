// app.js
const express = require("express");
const path = require("path");
const session = require("express-session");
const Sentry = require("./sentry.js");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cron = require("node-cron");
const cors = require("cors");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const transactionRouter = require("./routes/transactions");
const bodyParser = require("body-parser");
const sessionAuthMiddleware = require("./middleware/session.js");
const challengesRouter = require("./routes/challenge");
const historyRouter = require("./routes/history");
const options = require("./services/session.js");
const connectDB = require("./database/db");
const challengesController = require("./controllers/challenges");
const socket = require("./socket");
const handleConnection = require("./socketHandler.js");
let connectedSocketsCount = 0;
const app = express();
app.set("trust proxy", 1);
const allowedOrigins = require("./origion/allowedOrigins.js");

app.use(
  cors({
    credentials: true,
    origin: allowedOrigins,
  })
);

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
connectDB()
  .then(() => {
    const server = app.listen(4001, () => {
      console.log("Application and socket are running on port 4001");
    });

    setInterval(async () => {
      await challengesController.UpdateOpenChallenges();
    }, 2 * 60 * 1000);

    const io = socket.init(server);

    io.on("connection", (socket) => {
      connectedSocketsCount++;
      console.log(
        `Socket connected! Total connections: ${connectedSocketsCount}`
      );
      handleConnection(socket);
      socket.on("disconnect", () => {
        connectedSocketsCount--;
        console.log(
          `Socket disconnected! Total connections: ${connectedSocketsCount}`
        );
      });
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error.message);
  });

app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);

app.use(session(options));

app.use("/api/auth", authRouter);
app.use(sessionAuthMiddleware);
app.use("/api/user", userRouter);
app.use("/api/transaction", transactionRouter);
app.use("/api/challenges", challengesRouter);
app.use("/api/history", historyRouter);

module.exports = app;
