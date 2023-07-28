const fs = require("fs");
const responseHandler = async (res, status, data, error) => {
  try {
    return res.status(status).send({
      status,
      data,
      error,
    });
  } catch (error) {
    throw error;
  }
};

const generate = () => {
  const min = 1000000000; // Minimum 10-digit number (inclusive)
  const max = 9999999999; // Maximum 10-digit number (inclusive)

  const referCode = Math.floor(
    Math.random() * (max - min + 1) + min
  ).toString();
  console.log("referCode: " + referCode);
  return referCode;
};

function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

module.exports = {
  responseHandler,
  generate,

  randomIntFromInterval,
};
