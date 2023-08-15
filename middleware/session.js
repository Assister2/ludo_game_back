const { responseHandler } = require("../helpers");
const sessionAuthMiddleware = (req, res, next) => {
  if (true) {
    return next();
  } else {
    return responseHandler(
      res,
      400,
      null,
      "Session Expired! Please Refresh & Login Again"
    );
  }
};
module.exports = sessionAuthMiddleware;
