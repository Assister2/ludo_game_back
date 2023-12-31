const fs = require("fs");
const express = require("express");
const path = require("path");
const session = require("express-session");
const Sentry = require("./sentry.js");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const authRouter = require("./routes/auth.routes.js");
const userRouter = require("./routes/user.routes.js");

const refreshRouter = require("./routes/refreshToken.routes.js");

const transactionRouter = require("./routes/transactions.routes.js");
const payment = require("./routes/payment.routes.js");
const bodyParser = require("body-parser");
const sessionAuthMiddleware = require("./middleware/session.js");
const challengesRouter = require("./routes/challenge.routes.js");
const historyRouter = require("./routes/history.routes.js");
const { options } = require("./services/session.js");
const connectDB = require("./database/db");

require("./database/cronjobs/cronjobs.js");
const app = express();
app.set("trust proxy", 1);
const allowedOrigins = require("./origion/allowedOrigins.js");

const socket = require("./sockets/socketConnection/socket.js");
const { client } = require("./redis/allSocketConnection.js");
const handleConnection = require("./sockets/socketHandler.js");


app.use(
  cors({
    credentials: true,
    origin: allowedOrigins,
  })
);
const server = app.listen(4001, () => {
  console.log("Application and socket are running on produciton port 4001");
});

const io = socket.init(server);

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
connectDB().then(async () => {
  io.on("connection", async (socket) => {
    const userId = socket.user.id;

    const previousSocketId = await client.get(userId);
    if (previousSocketId) {
      const previousSocket = await io.sockets.sockets.get(previousSocketId);
      if (previousSocket) {
        previousSocket.disconnect();
        client.del(userId);
      }
    }
    await client.set(userId, socket.id);
    handleConnection(socket, io);
  });
});

app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "./client/build")));

app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);

app.get("/", (req, res, next) => {
  fs.readFile(
    "./client/build/index.html",
    { encoding: "utf-8" },
    (err, data) => {
      console.log(err);
      if (err) {
        res.send("Error occurred while reading the index.html file.");
        return;
      }
      res.send(data);
    }
  );
});

app.use(session(options));

app.use("/api/auth", authRouter);
app.use("/api/buychips", payment);
app.use(sessionAuthMiddleware);
app.use("/api/user", userRouter);
app.use("/api/refreshToken",refreshRouter);
app.use("/api/transaction", transactionRouter);
app.use("/api/challenges", challengesRouter);
app.use("/api/history", historyRouter);

module.exports = { app, io };
