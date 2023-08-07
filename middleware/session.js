const { responseHandler } = require("../helpers");
const sessionAuthMiddleware = (req, res, next) => {
  return next();
  // if (req.session && req.session.user) {
  //   return next();
  // } else {
  //   return responseHandler(res, 400, null, "Unauthorized");
  // }
};
module.exports = sessionAuthMiddleware;
