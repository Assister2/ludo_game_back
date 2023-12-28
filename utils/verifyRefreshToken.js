const UserToken = require("../models/userToken.js");
const User = require("../models/user.js");
const jwtToken = require("jsonwebtoken");

const verifyRefreshToken = (refreshToken) => {
    const privateKey = process.env.REFRESH_TOKEN;
    console.log("RefreshToken in verify refreshToken ", refreshToken);
    return new Promise((resolve, reject) => {
        // User.findOne((user) => { 
        //     console.log("ASDASDSAASDAS",user);
        //     user['refreshToken']['refreshToken'] == refreshToken; 
        // }, (err, doc) => {
        //     if (!doc)
        //     {
        //         console.log("AVAILABLE");
        //         return reject({ error: true, message: "Invalid refresh token1" });
        //     }
        jwtToken.verify(refreshToken, privateKey, (err, tokenDetails) => {
            if (err){
                console.log("ERROR_SU",err);
                return reject({ error: true, message: "Invalid refresh token2" });
            }
            console.log("DECODED TOKEN_________",tokenDetails)
            resolve({
                tokenDetails,
                error: false,
                message: "Valid refresh token",
            });
        });
        // });
    });
};

module.exports = verifyRefreshToken;