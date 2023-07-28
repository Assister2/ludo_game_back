const jwt = require("jsonwebtoken");


module.exports = async function (token) {
  if (!token) {
    throw new Error("Authorization failed");
  }

  try {
    let verified = jwt.verify(token, "234124qweASd");
    console.log("verified", verified);
    return verified
 
  } catch (error) {
    return { error: error.message };
  }
};
