const UserToken = require("../models/userToken.js");
const jwtToken = require("jsonwebtoken");

const generateTokens = async (user) => {
    try {
        // console.log("GENERATE function", user);
        const payload = { id:user._id, phone: user.phone };
        const accessToken = jwtToken.sign(
            payload,
            process.env.TOKEN_SECRET,
            { expiresIn: "30s" }
        );
        const refreshToken = jwtToken.sign(
            payload,
            process.env.REFRESH_TOKEN,
            { expiresIn: "30d" }
        );
        // console.log("Access & Refresh TOKEN", accessToken, refreshToken);
        const userToken = await UserToken.findOne({ userId: user._id });

        // console.log("GENERATE TOKEN", userToken);
        if (userToken) await userToken.remove();
        
        await new UserToken({ userId: user._id, token: refreshToken }).save();
        // console.log("REFRE TOKEN", userToken);
        return Promise.resolve({ accessToken, refreshToken });
    } catch (err) {
        return Promise.reject(err);
    }
};

module.exports = generateTokens;