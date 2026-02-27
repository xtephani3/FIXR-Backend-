import mongoose from "mongoose";

const artisanSchema = new mongoose.Schema({
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
    city: {
        type: String
    },
    state: {
        type: String
    },
    serviceRendered: {
        type: String,
        enum: ["mechanic", "plumber", "welder", "carpenter", "tailor", "shoe-maker", "technician", "electrician"]
    },
    serviceDescription: {
        type: String //e.g deals with all kind of phone repairs
    },
    passportImg: {
        type: String
    },
    cv: {
        type: String
    },
    applicationStatus: {
        type: String,
        enum: ["pending", "approved"],
        default: "pending"
    },
    reviews: [{
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer"
        },
        comment: String,
        rating: {
            type: Number,
            max: 5
        }
    }],
    loggedIn: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const Artisan = mongoose.model("Artisan", artisanSchema)
export default Artisan;

//you must leave a rating if you would be leaving a rating (star) but you can rate without review 