const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
require("dotenv").config(); // Load environment variables from .env file

const store = new MongoDBStore({
  uri: "mongodb+srv://asim_ludo:asim_ludo123@cluster0.qqbzp.mongodb.net/ludo22", // Use an environment variable for MongoDB URI
  collection: "sessions",
  // Add more options for MongoDBStore if necessary, like connectionOptions, autoReconnect, etc.
});
store.on("error", (error) => {
  console.error("MongoDBStore connection error:", error);
});
const thirtyDaysInMilliseconds = 30 * 24 * 60 * 60 * 1000;
const maxAgeForSessionCookie =
  process.env.SESSION_COOKIE_MAX_AGE || thirtyDaysInMilliseconds;

const options = {
  secret: "somethinsecret",
  store: store,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: false,
    maxAge: parseInt(maxAgeForSessionCookie),
    secure: true, // Use an environment variable to conditionally enable secure cookie
    domain: ".gotiking.com", // Use an environment variable for the cookie domain or leave it undefined
  },
};

module.exports = options;
