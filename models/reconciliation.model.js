import mongoose from "mongoose";

const reconciliationSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },
    artisanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Artisan",
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    receiptUrl: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "rejected"],
        default: "pending"
    },
    adminNote: {
        type: String
    }
}, { timestamps: true })

const Reconciliation = mongoose.model("Reconciliation", reconciliationSchema)
export default Reconciliation;
