import Customer from "../models/customer.model.js";
import Auth from "../models/auth.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { hashPassword } from "../utils/util.js";

export const getAllCustomer = async (_req, res) => {
    try {
        const allCustomers = await Customer.find().populate("auth", "email -_id");
        return res.status(200).json(allCustomers);
    } catch (error) {
        console.log("Error in getAllCustomer function in customer.controller.js", error.message);
        res.status(500).json({ message: "Cannot get all customers" });
    }
};

export const getCustomerById = async (req, res) => {
    const customerId = req.params.id ?? req.body.id;

    if (!customerId) {
        return res.status(400).json({ message: "Provide a customerId" });
    }

    try {
        const customer = await Customer.findById(customerId).populate("auth", "email -_id");
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        return res.status(200).json(customer);  
    } catch (error) {
        console.log("Error in getCustomerById function in customer.controller.js", error.message);
        res.status(500).json({ message: error.message });
    }
};

export const updateProfile = async (req, res) => {
    const userId = req.user.id;
    const { firstName, lastName, phoneNumber } = req.body;

    if (!firstName || !lastName) {
        return res.status(400).json({ message: "First name and last name are required" });
    }

    try {
        const customer = await Customer.findByIdAndUpdate(
            userId,
            { firstName, lastName, phoneNumber },
            { new: true }
        );
        if (!customer) return res.status(404).json({ message: "Customer not found" });
        return res.status(200).json({ message: "Profile updated!", customer });
    } catch (error) {
        console.error("Error in updateProfile:", error.message);
        res.status(500).json({ message: "Error updating profile" });
    }
};

export const changePassword = async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Both current and new passwords are required" });
    }

    try {
        const auth = await Auth.findOne({ userId });
        if (!auth || !auth.password) {
            return res.status(400).json({ message: "Password change is not available for Google sign-in accounts" });
        }

        const isMatch = await bcrypt.compare(currentPassword, auth.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        auth.password = hashPassword(newPassword);
        await auth.save();

        return res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Error in changePassword:", error.message);
        res.status(500).json({ message: "Error changing password" });
    }
};

export const deleteAccount = async (req, res) => {
    const userId = req.user.id;

    try {
        await Auth.findOneAndDelete({ userId });
        await Customer.findByIdAndDelete(userId);

        res.clearCookie("stored_token", { path: "/", httpOnly: true });
        return res.status(200).json({ message: "Account deleted successfully" });
    } catch (error) {
        console.error("Error in deleteAccount:", error.message);
        res.status(500).json({ message: "Error deleting account" });
    }
};

const resolveCustomerIdFromToken = async (req) => {
    const token = req.cookies?.stored_token;
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.id) return null;
        const customer = await Customer.findById(decoded.id);
        return customer ? customer._id : null;
    } catch {
        return null;
    }
};

export const updateRealtimeLocation = async (req, res) => {
    const payload = req.body?.location ?? req.body ?? {};
    const latitude = Number(payload.latitude);
    const longitude = Number(payload.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res.status(400).json({ message: "latitude and longitude are required" });
    }

    const realtimeLocation = {
        latitude,
        longitude,
        accuracy: Number.isFinite(Number(payload.accuracy)) ? Number(payload.accuracy) : undefined,
        city: payload.city,
        state: payload.state,
        country: payload.country,
        countryCode: payload.countryCode,
        source: payload.source === "ip" ? "ip" : "gps",
        isApproximate: Boolean(payload.isApproximate),
        updatedAt: new Date()
    };

    const customerId = await resolveCustomerIdFromToken(req);
    if (!customerId) {
        return res.status(202).json({ message: "Location received", persisted: false });
    }

    try {
        const customer = await Customer.findByIdAndUpdate(
            customerId,
            { realtimeLocation },
            { new: true }
        );

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        return res.status(200).json({
            message: "Location saved",
            persisted: true,
            realtimeLocation: customer.realtimeLocation
        });
    } catch (error) {
        console.error("Error in updateRealtimeLocation:", error.message);
        return res.status(500).json({ message: "Error saving location" });
    }
};
