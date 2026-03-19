import Message from "../models/message.model.js";
import Order from "../models/order.model.js";

export const getMessagesByOrder = async (req, res) => {
    const { orderId } = req.params;
    try {
        const currentOrder = await Order.findById(orderId);
        if (!currentOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Find all orders between this exact customer and artisan
        const customerIdMatch = currentOrder.customerId ? currentOrder.customerId.toString() : null;
        const artisanIdMatch = currentOrder.artisanId ? currentOrder.artisanId.toString() : null;

        const matchingOrders = await Order.find({ 
            customerId: customerIdMatch, 
            artisanId: artisanIdMatch 
        }).select('_id');
        
        const matchingOrderIds = matchingOrders.map(order => order._id.toString());

        // Fetch messages belonging to ANY of those orders
        const messages = await Message.find({ orderId: { $in: matchingOrderIds } }).sort({ createdAt: 1 });
        return res.status(200).json(messages);
    } catch (err) {
        console.log("Error in getMessagesByOrder function", err.message);
        return res.status(500).json({ message: "Error fetching messages" });
    }
};

export const sendMessage = async (req, res) => {
    const { orderId } = req.params;
    const { text, image } = req.body;
    const senderId = req.user.id;
    const senderModel = req.user.role === "customer" ? "Customer" : "Artisan";

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
