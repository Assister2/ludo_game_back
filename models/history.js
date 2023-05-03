const mongoose = require("mongoose")
const schema = mongoose.Schema
let historySchema = new mongoose.Schema({
    userId: {
        type: schema.Types.ObjectId, ref: "users",
    },
    type: {
        type: String,  //0 for buy and 1 for sell
        default: ""
    },
    status:{
        type:String,
        default:""
    },
    roomCode:{
        type:String,
        default:""
    },
    upiId:{
        type:String,
        default:"",
    },
    amount:{
        type:Number,
        default:0
    },
    historyText:{
        type:String,
        default:""
    },
    closingBalance:{
        type:Number,
        default:0
    },
    createdAt: {
        type: Date,
        default: ""
    }

})



let History = mongoose.model("history", historySchema)
module.exports = History