import Artisan from "../models/artisan.model.js";
import Order from "../models/order.model.js";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

export const createOrderByCustomer = async (req, res) => {
    const customerId = req.user.id

    const { artisanId, problem, location, images } = req.body;

    if (!artisanId || !problem || !location) {
        return res.status(400).json({ message: "Fill all fields" })
    }

    try {
        let savedImages = [];
        if (images && Array.isArray(images)) {
            // Configure cloudinary just in time so it seamlessly ignores if keys aren't added yet
            const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
            if (useCloudinary) {
                cloudinary.config({
                    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                    api_key: process.env.CLOUDINARY_API_KEY,
                    api_secret: process.env.CLOUDINARY_API_SECRET
                });
            }

            for (let i = 0; i < images.length; i++) {
                try {
                    if (useCloudinary) {
                        try {
                            const uploadRes = await cloudinary.uploader.upload(images[i], { folder: "fixr_issues" });
                            savedImages.push(uploadRes.secure_url);
                            continue; // Successfully uploaded to cloud, skip local write
                        } catch (cloudErr) {
                            console.error("Cloudinary upload failed, falling back to local FS:", cloudErr);
                        }
                    }

                    // Fallback to local File System if No Cloudinary or if Cloudinary failed
                    const base64Data = images[i].replace(/^data:image\/\w+;base64,/, "");
                    const extMatch = images[i].match(/^data:image\/(\w+);base64,/);
                    const ext = extMatch ? extMatch[1] : 'jpg';
                    const filename = `issue-${Date.now()}-${i}.${ext}`;
                    const filepath = path.join(process.cwd(), 'uploads', filename);
                    fs.writeFileSync(filepath, base64Data, 'base64');
                    savedImages.push(filename);
                } catch(e) {
                    console.error("Error saving base64 image:", e);
                }
            }
        }

        const newOrder = new Order({
            customerId,
            artisanId,
            problem,
            location,
            images: savedImages
        })
        await newOrder.save()

        return res.status(201).json("Order created!")
    } catch (err) {
        console.log("Error in createOrderByCustomer function in order.controller.js", err.message)
        return res.status(500).json({ message: "Error creating order" } || "Server error")
    }
}

export const getOrderByCustomerId = async (req, res) => {
    const customerId = req.user.id
    try {
        let orders = await Order.find({ customerId }).populate("artisanId")
        return res.status(200).json(orders)
    } catch (err) {
        console.log("Error in getOrderByCustomerId  function in order.controller.js", err.message)
        return res.status(500).json({ message: "Error fetching customer's orders" })
    }
}

export const getOrderByArtisanId = async (req, res) => {
    const artisanId = req.user.id
    try {
        let orders = await Order.find({ artisanId }).populate("customerId")
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
    const { note } = req.body

    const preImg = req.files.preImg?.[0].filename
    const postImg = req.files.postImg?.[0].filename

    //console.log(preImg, postImg)

    try {
        let orders = await Order.findByIdAndUpdate(orderId, { repairReport: { preImg, postImg, note } }, { new: true })
        return res.status(200).json(orders)
    } catch (err) {
        console.log("Error in updateOrderRepairReport function in order.controller.js", err.message)
        return res.status(500).json({ message: "Error adding repair report to order" })
    }
}