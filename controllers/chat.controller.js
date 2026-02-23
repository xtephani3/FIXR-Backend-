import Message from "../models/message.model.js";
import Order from "../models/order.model.js";

export const getMessagesByOrder = async (req, res) => {
    const { orderId } = req.params;
    try {
        const messages = await Message.find({ orderId }).sort({ createdAt: 1 });
        return res.status(200).json(messages);
    } catch (err) {
        console.log("Error in getMessagesByOrder function", err.message);
        return res.status(500).json({ message: "Error fetching messages" });
    }
};

export const sendMessage = async (req, res) => {
    const { orderId } = req.params;
    const { text } = req.body;
    const senderId = req.user.id;
    const senderModel = req.user.role === "customer" ? "Customer" : "Artisan";
    
    // Support image attachments from multer
    const image = req.file ? req.file.filename : null;

    if (!text && !image) {
        return res.status(400).json({ message: "Message text or image is required" });
    }

    try {
        const newMessage = new Message({
            orderId,
            senderId,
            senderModel,
            text: text || "",
            image
        });
        await newMessage.save();
        return res.status(201).json(newMessage);
    } catch (err) {
        console.log("Error in sendMessage function", err.message);
        return res.status(500).json({ message: "Error sending message" });
    }
};
