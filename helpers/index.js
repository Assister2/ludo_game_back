const fs = require("fs")
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

const generate = (n) => {
  var add = 1,
    max = 12 - add; // 12 is the min safe number Math.random() can generate without it starting to pad the end with zeros.

  if (n > max) {
    return generate(max) + generate(n - max);
  }

  max = Math.pow(10, n + add);
  var min = max / 10; // Math.pow(10, n) basically
  var number = Math.floor(Math.random() * (max - min + 1)) + min;
  let str = ("" + number).substring(add)
  if(str[0] == "0"){
    generate(n)
  }
  else{
    return str
  }
};

const uploadFileImage = (base64, fileName, extension) => {
  try {
    const path =  fileName + `.${extension}`;
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

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

module.exports = { responseHandler ,generate,uploadFileImage,randomIntFromInterval};
