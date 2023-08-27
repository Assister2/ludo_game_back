var express = require("express");
const Router = express.Router();
const UserToken = require("../models/userToken.js");
const jwtToken = require("jsonwebtoken");
// import verifyRefreshToken from "../utils/verifyRefreshToken.js";
const verifyRefreshToken = require("../utils/verifyRefreshToken.js");
// const router = Router();

Router.post("/", async (req, res) => {
    verifyRefreshToken(req.body.refreshToken)
        .then(({ tokenDetails }) => {
            const payload = { _id: tokenDetails._id};
            const accessToken = jwtToken.sign(
                payload,
                process.env.TOKEN_SECRET,
                { expiresIn: "30s" }
            );
            res.status(200).json({
                error: false,
                accessToken,
                message: "Access token created successfully",
            });
        })
        .catch((err) => res.status(400).json(err));
});

module.exports = Router;