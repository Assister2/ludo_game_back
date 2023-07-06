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

const uploadFileImage = (base64, fileName, extension) => {
  try {
    const path = fileName + `.${extension}`;
    const imgdata = base64;
    const base64Data = imgdata.replace(/^data:([A-Za-z-+/]+);base64,/, "");
    const imageUrl = `${fileName}.${extension}`;
    fs.writeFileSync(path, base64Data, { encoding: "base64" });
    return imageUrl;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

module.exports = {
  responseHandler,
  generate,
  uploadFileImage,
  randomIntFromInterval,
};
