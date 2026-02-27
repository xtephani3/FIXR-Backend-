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
    loggedIn: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const Customer = mongoose.model("Customer", customerSchema)
export default Customer;