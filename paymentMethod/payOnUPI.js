const axios = require("axios");
const axiosConfig = axios.create(); // You may have other configurations here

const getUPILink = async (userId, amount, userFullName) => {
  try {
    const requestData = {
      key: process.env.PAY_ON_UPI_SECRET,
      client_txn_id: userId, // Replace this with a unique transaction ID or use a library to generate it.
      amount: String(amount), // Convert amount to string
      p_info: "Buy Chips",
      customer_name: userFullName,
      redirect_url: "http://68.183.89.191:3000/wallet",
    };

    const response = await axios.post(
      "https://merchant.upigateway.com/api/create_order",
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Assuming the response contains the payment URL
    const paymentUrl = response.data.payment_url;

    // Redirect the user to the payment URL or use it as needed
    console.log("Payment URL:", paymentUrl);
    return paymentUrl;
  } catch (error) {
    console.error("Error while getting UPI link:", error);
    throw error;
  }
};
