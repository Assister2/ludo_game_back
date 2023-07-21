const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const store = new MongoDBStore({
  uri: "mongodb+srv://asim_ludo:asim_ludo123@cluster0.qqbzp.mongodb.net/ludo20",
  collection: "sessions",
});
const options = {
  secret: "I am stuck, help me please!",
  store: store,
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: true, // Set this to true to enable the cookie over HTTPS
  },
};
module.exports = options;
