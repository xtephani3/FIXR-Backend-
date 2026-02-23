import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";

import Auth from "../models/auth.model.js";

const env = process.env.NODE_ENV || "development";
const isProduction = env === "production";

export const hashPassword = (password) => {
    const hashedPassword = bcrypt.hashSync(password, 10)
    return hashedPassword;
}

export const handleLogin = (Model) => {
    return async (req, res) => {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Fill in all fields"
            });
        }

        const existingAccount = await Auth.findOne({ email })

        if (!existingAccount) {
            return res.status(400).json({ message: "Incorrect login details" })
        }

        const passwordValid = await bcrypt.compare(password, existingAccount.password);

        if (!passwordValid) {
            return res.status(400).json({ message: "Incorrect login details" })
        }

        try {
            const token = jwt.sign({
                id: existingAccount.userId, email: existingAccount.email
            }, process.env.JWT_SECRET);


            res.cookie("stored_token", token, {
                path: "/",
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? "none" : "lax"
            })

            const accountDetails = await Model.findById(existingAccount.userId);
            accountDetails.loggedIn = true;
            await accountDetails.save();

            return res.status(200).json({ message: "Login successful", accountDetails});
        } catch (err) {
            console.log("Error in login function in auth.controller.js")
            return res.status(500).json({ message: "Error logging in user" })
        }
    }
}
export const handleLogout = (Model, accountId) => {
    return async (req, res) => {
        try {
            const accountDetails = await Model.findById(accountId)
            accountDetails.loggedIn = false;
            await accountDetails.save();

            res.setHeader("Cache-Control", "no-store");
            res.setHeader("Pragma", "no-cache");
            res.clearCookie("stored_token", {
                path: "/",
                httpOnly: true,
                secure: true,
                sameSite: "none"
            })
            return res.status(200).json({ message: "Logged out" });
        } catch (err) {
            console.log("Error in logout function in auth.controller.js")
            return res.status(500).json({ message: "Error logging out user" } || "Server error")
        }
    }
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
    }
})

export const upload = multer({
    limits: { fileSize: 1 * 1024 * 1024 },
    storage: storage
})
