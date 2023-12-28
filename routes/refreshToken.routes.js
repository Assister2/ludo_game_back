var express = require("express");
const Router = express.Router();
const UserToken = require("../models/userToken.js");
const jwtToken = require("jsonwebtoken");
const verifyRefreshToken = require("../utils/verifyRefreshToken.js");

Router.post("/token", async (req, res) => {
    console.log("_________________REFRESH ROUTE______________________",req.body);
    verifyRefreshToken(req.body.refreshToken)
        .then(({ tokenDetails }) => {
            console.log("VERIFY SUCCESS",tokenDetails);
            console.log("Second", tokenDetails.id, "_____________");
            const payload = { id: tokenDetails.id, phone: tokenDetails.phone};
            const accessToken = jwtToken.sign(
                payload,
                process.env.TOKEN_SECRET,
                { expiresIn: "30s" }
            );
            console.log("NEWTOKEN_______", accessToken);
            res.status(200).json({
                error: false,
                accessToken,
                message: "Access token created successfully",
            });
        })
        .catch((err) => res.status(400).json(err));
});

module.exports = Router;