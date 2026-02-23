import Auth from "../models/auth.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config()

/**
 * Safely extract a cookie value by name from the raw Cookie header string.
 * Handles multiple cookies (e.g. "stored_token=xyz; _ga=abc") correctly.
 * The previous `split("=")[1]` approach only worked when the token cookie
 * was the sole cookie in the header — as soon as any other cookie exists
 * (analytics, etc.) the split returns garbage and JWT verification fails.
 */
function parseCookie(cookieHeader, name) {
    if (!cookieHeader) return null;
    const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${name}=`));
    return match ? match.slice(name.length + 1) : null;
}

export const verifyAccessByModel = (Model) => {
 
    return async (req, res, next) => {
        const token = parseCookie(req.headers.cookie, "stored_token");

        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const authorizedAccount = await Model.findById(decoded.id);

            if (!authorizedAccount) {
                return res.status(401).json({ message: "Access Denied" });
            }

            req.user = decoded;
            next();

        } catch {
            return res.status(401).json({ message: "Invalid token" });
        }
    }
};

export const verifyAccessByLogin = async (req, res, next) => {
   
        const token = parseCookie(req.headers.cookie, "stored_token");

        if (!token) {
            return res.status(401).json({ message: "Login to proceed" });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const authorizedAccount = await Auth.findOne({userId:decoded.id});

            if (!authorizedAccount) {
                return res.status(401).json({ message: "Access Denied" });
            }

            req.user = decoded;
            next();

        } catch {
            return res.status(401).json({ message: "Invalid token" });
        }
    }
