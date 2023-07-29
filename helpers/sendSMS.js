const fetch = require("node-fetch");

const apiKey =
  "ag2quLpUryWSJs8VDXECRTOvKN5c6lG93FxZdMQwP1eYio4zbtzLcOSKRaqufr4WvpZen32ilDb7XJG9";
const url = "https://www.fast2sms.com/dev/bulkV2";
const sendText = async (text, phoneNumber) => {
  const data = {
    variables_values: text,
    route: "otp",
    numbers: +phoneNumber,
  };

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: apiKey,
    },
    body: JSON.stringify(data),
  };

  const response = await fetch(url, options);
  const json = await response.json();

  console.log("smsResult", json);
  return json;
};

module.exports = sendText;
