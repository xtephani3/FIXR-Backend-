import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    senderModel: {
        type: String,
        required: true,
        enum: ["Customer", "Artisan"]
    },
    text: {
        type: String,
        required: true
    },
    image: {
        type: String
    }
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;
