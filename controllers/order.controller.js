import Artisan from "../models/artisan.model.js";
import Order from "../models/order.model.js";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import sendEmail from "../utils/email.js";

export const createOrderByCustomer = async (req, res) => {
    const customerId = req.user.id

    const { artisanId, problem, location, images } = req.body;

    if (!artisanId || !problem || !location) {
        return res.status(400).json({ message: "Fill all fields" })
    }

    try {
        let savedImages = [];
        if (images && Array.isArray(images)) {
            // Azure URLs are already pre-uploaded through Booking pipeline and provided straight in `images`
            savedImages = images;
        }

        const newOrder = new Order({
            customerId,
            artisanId,
            problem,
            location,
            images: savedImages
        })
        await newOrder.save()

        try {
            const artisan = await Artisan.findById(artisanId).populate("auth");
            if (artisan && artisan.auth && artisan.auth.email) {
                 await sendEmail({
                    to: artisan.auth.email,
                    subject: "You have a new booking on Fixr!",
                    text: `Hello ${artisan.firstName},\n\nYou have just received a new repair booking on Fixr for the following job in ${location}:\n\n${problem}\n\nPlease log in to your dashboard to review and quote the repair to begin.`
                });
            }
        } catch (mailErr) {
            console.error("Error sending booking notification email to artisan", mailErr);
        }

        return res.status(201).json("Order created!")
    } catch (err) {
        console.log("Error in createOrderByCustomer function in order.controller.js", err.message)
        return res.status(500).json({ message: "Error creating order" } || "Server error")
    }
}

export const getOrderByCustomerId = async (req, res) => {
    const customerId = req.user.id
    try {
        let orders = await Order.find({ customerId }).sort({ createdAt: -1 }).populate("artisanId")
        return res.status(200).json(orders)
    } catch (err) {
        console.log("Error in getOrderByCustomerId  function in order.controller.js", err.message)
        return res.status(500).json({ message: "Error fetching customer's orders" })
    }
}

export const getOrderByArtisanId = async (req, res) => {
    const artisanId = req.user.id
    try {
        let orders = await Order.find({ artisanId }).sort({ createdAt: -1 }).populate("customerId")
        return res.status(200).json(orders)
    } catch (err) {
        console.log("Error in getOrderByArtisanId function in order.controller.js", err.message)
        return res.status(500).json({ message: "Error fetching artisan's orders" })
    }
}

export const updateOrderReview = async (req, res) => {
    const customerId = req.user.id;
    const { orderId } = req.params;
    const { comment, rating } = req.body
    try {
        let order = await Order.findByIdAndUpdate(orderId, { review: { customerId, comment, rating } }, { new: true })

        const artisan = await Artisan.findByIdAndUpdate(order.artisanId, { $push: { reviews: { customerId, comment, rating } } }, { new: true });

        return res.status(200).json(order)
    } catch (err) {
        console.log("Error in updateOrderReview function in order.controller.js", err.message)
        return res.status(500).json({ message: "Error adding review to order" })
    }
}

export const updateOrderRepairStatus = async (req, res) => {
    const { orderId } = req.params;
    const { repairStatus } = req.body
    try {
        let orders = await Order.findByIdAndUpdate(orderId, { repairStatus }, { new: true })
        return res.status(200).json(orders)
    } catch (err) {
        console.log("Error in updateOrderRepairStatus function in order.controller.js", err.message)
        return res.status(500).json({ message: "Error adding repair status to order" })
    }
}
export const updateOrderRepairFee = async (req, res) => {
    const { orderId } = req.params;
    const { repairFee } = req.body
    try {
        let orders = await Order.findByIdAndUpdate(orderId, { repairFee }, { new: true })
        return res.status(200).json(orders)
    } catch (err) {
        console.log("Error in updateOrderRepairFee function in order.controller.js", err.message)
        return res.status(500).json({ message: "Error adding repair fee to order" })
    }
}

export const updateOrderRepairReport = async (req, res) => {

    const { orderId } = req.params;
    const { note, preImg, postImg } = req.body

    //console.log(preImg, postImg)

    try {
        let orders = await Order.findByIdAndUpdate(orderId, { repairReport: { preImg, postImg, note } }, { new: true })
        return res.status(200).json(orders)
    } catch (err) {
        console.log("Error in updateOrderRepairReport function in order.controller.js", err.message)
        return res.status(500).json({ message: "Error adding repair report to order" })
    }
}