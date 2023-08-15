const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const config = require("../helpers/config");
require("dotenv").config(); // Load environment variables from .env file

const store = new MongoDBStore({
  uri: config.DB_URI,
  collection: "sessions",
  // Add more options for MongoDBStore if necessary, like connectionOptions, autoReconnect, etc.
});
store.on("error", (error) => {
  console.error("MongoDBStore connection error:", error);
});
const thirtyDaysInMilliseconds = 30 * 24 * 60 * 60 * 1000;
const maxAgeForSessionCookie = thirtyDaysInMilliseconds;

// Define options based on environment
const options = {
  secret: config.SESSION_SECRET,
  store: store,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: false,
    maxAge: parseInt(maxAgeForSessionCookie),
  },
};

if (config.NODE_ENV === "production" || config.NODE_ENV === "staging") {
  options.cookie.secure = true; // Use an environment variable to conditionally enable secure cookie
  options.cookie.domain = ".gotiking.com"; // Use an environment variable for the cookie domain or leave it undefined
}

module.exports = { store, options };
