import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

import Auth from "../models/auth.model.js";
import Customer from "../models/customer.model.js";
import Artisan from "../models/artisan.model.js";
import Admin from "../models/admin.model.js";

const MODEL_MAP = {
    Customer,
    Artisan,
    Admin,
};

/** Safely parse a specific cookie by name from the Cookie header string. */
function parseCookie(cookieHeader, name) {
    if (!cookieHeader) return null;
    const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${name}=`));
    return match ? match.slice(name.length + 1) : null;
}


/**
 * GET /api/auth/me
 * Reads the stored_token cookie, verifies it, then returns a lean
 * user object so the frontend can bootstrap its session.
 *
 * Response shape:
 * {
 *   id:        string   – Mongo _id of the profile document
 *   email:     string
 *   firstName: string
 *   lastName:  string
 *   role:      "Customer" | "Artisan" | "Admin"
 * }
 */
export const getMe = async (req, res) => {
    const token = parseCookie(req.headers.cookie, "stored_token");

    if (!token) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Look up the Auth record to know which model to query
        const authRecord = await Auth.findOne({ userId: decoded.id });
        if (!authRecord) {
            return res.status(401).json({ message: "Session invalid" });
        }

        const Model = MODEL_MAP[authRecord.userModel];
        if (!Model) {
            return res.status(401).json({ message: "Unknown user type" });
        }

        const profile = await Model.findById(decoded.id).lean();
        if (!profile) {
            return res.status(401).json({ message: "User not found" });
        }

        return res.status(200).json({
            id: profile._id,
            email: authRecord.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            role: authRecord.userModel,   // "Customer" | "Artisan" | "Admin"
        });

    } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
