const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userTokenSchema = new mongoose.Schema({
    userId: { type: Schema.Types.ObjectId, required: true },
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: "1d" }, // 30 days
});

const UserToken = mongoose.model("UserToken", userTokenSchema);

module.exports = UserToken;