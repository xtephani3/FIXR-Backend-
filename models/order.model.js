import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer"
    },
    artisanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Artisan"
    },
    problem: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    repairFee: Number,
    paymentStatus: {
        type: String,
        enum: ["pending", "paid"],
        default: "pending"
    },
    repairStatus: {
        type: String,
        enum: ["pending", "inspected", "declined", "accepted", "delivered"],
        default: "pending"
    },
    repairReport: {
        preImg: String,
        postImg: String,
        note: String
    },
    images: [{ type: String }],
    review: {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer"
        },
        comment: String,
        rating: {
            type: Number,
            max: 5
        },
        tags: [String],
        photos: [String],
        createdAt: {
            type: Date,
            default: Date.now
        }
    },

}, { timestamps: true })

const Order = mongoose.model("Order", orderSchema)
export default Order;

