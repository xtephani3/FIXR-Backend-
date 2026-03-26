import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
    auth: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Auth"
    },
    firstName: {
        type: String
    },
    lastName: {
        type: String
    },
    phoneNumber: {
        type: String
    },
    realtimeLocation: {
        latitude: Number,
        longitude: Number,
        accuracy: Number,
        city: String,
        state: String,
        country: String,
        countryCode: String,
        source: {
            type: String,
            enum: ["gps", "ip"],
            default: "gps"
        },
        isApproximate: Boolean,
        updatedAt: Date
    },
    loggedIn: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const Customer = mongoose.model("Customer", customerSchema)
export default Customer;
