import Auth from "../models/auth.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config()

export const verifyAccessByModel = (Model) => {
 
    return async (req, res, next) => {
        const token = req.cookies["stored_token"];

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
