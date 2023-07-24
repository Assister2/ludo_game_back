const dotenv = require("dotenv");
const mongoose = require("mongoose");
const express = require("express");
const handleConnection = require("./socketHandler.js");
const path = require("path");
const session = require("express-session");
const Sentry = require("./sentry.js");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const transactionRouter = require("./routes/transactions");
const options = require("./services/session.js");
const challengesRouter = require("./routes/challenge");
const historyRouter = require("./routes/history");
const challengesController = require("./controllers/challenges");
const bodyParser = require("body-parser");
const app = express();
app.set("trust proxy", 1);
const socket = require("./socket");
const sessionAuthMiddleware = require("./middleware/session.js");
const expressSession = session(options);

dotenv.config();
const allowedOrigins = [
  "https://www.gotiking.com/",
  "https://push.gotiking.com",
  "https://push.gotiking.com/",
  "https://push.gotiking.com",
  "https://gotiking.com/",
  "https://gotiking.com",
  "https://www.gotiking.com",
  "http://localhost:3000",

  // Add more origins as needed
];
app.use(
  cors({
    credentials: true,
    origin: allowedOrigins,
  })
);
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
mongoose
  .connect(
    "mongodb+srv://asim_ludo:asim_ludo123@cluster0.qqbzp.mongodb.net/ludo20",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    }
  )
  .then(() => {
    console.log("MongoDB connected");
    const server2 = app.listen(4001, () => {
      console.log("application and socket is running on port 4001");
    });
    setInterval(async () => {
      // await challengesController.purgeDatabase();
      await challengesController.UpdateOpenChallenges();
    }, 2 * 60 * 1000);
    const io = socket.init(server2);

    io.on("connection", (socket) => {
      handleConnection(socket);
    });
  })
  .catch((error) => {
    console.log("eerror", error.message);
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

app.use(expressSession);

app.use("/api/auth", authRouter);
app.use(sessionAuthMiddleware);
app.use("/api/user", userRouter);
app.use("/api/transaction", transactionRouter);
app.use("/api/challenges", challengesRouter);
app.use("/api/history", historyRouter);

module.exports = app;
