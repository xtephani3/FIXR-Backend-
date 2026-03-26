import Artisan from "../models/artisan.model.js";
import Customer from "../models/customer.model.js";
import Order from "../models/order.model.js";
import Reconciliation from "../models/reconciliation.model.js";
import mongoose from "mongoose";
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
        const filter = buildOrderFilter({ ownerKey: "customerId", ownerId: customerId, query: req.query });
        const { page, limit, skip, usePagination } = getPagination(req.query);
        const selectFields = buildSelect(req.query.fields);

        let query = Order.find(filter).sort({ createdAt: -1 });
        if (selectFields) {
            query = query.select(selectFields);
        }
        query = query.populate("artisanId");

        if (usePagination) {
            query = query.skip(skip).limit(limit);
        }

        const [orders, total] = await Promise.all([
            query,
            usePagination ? Order.countDocuments(filter) : Promise.resolve(null)
        ]);

        if (!usePagination) {
            return res.status(200).json(orders);
        }

        return res.status(200).json({
            data: orders,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.log("Error in getOrderByCustomerId  function in order.controller.js", err.message)
        return res.status(500).json({ message: "Error fetching customer's orders" })
    }
}

export const getOrderByArtisanId = async (req, res) => {
    const artisanId = req.user.id
    try {
        const filter = buildOrderFilter({ ownerKey: "artisanId", ownerId: artisanId, query: req.query });
        const { page, limit, skip, usePagination } = getPagination(req.query);
        const selectFields = buildSelect(req.query.fields);

        let query = Order.find(filter).sort({ createdAt: -1 });
        if (selectFields) {
            query = query.select(selectFields);
        }
        query = query.populate("customerId").lean();

        if (usePagination) {
            query = query.skip(skip).limit(limit);
        }

        let orders = await query;
        const orderIds = orders.map(order => order._id);
        const reconciliations = await Reconciliation.find({ 
            artisanId, 
            orderId: { $in: orderIds } 
        }).lean();
        
        orders = orders.map(order => {
            const rec = reconciliations.find(r => r.orderId.toString() === order._id.toString());
            if (rec) {
                order.reconciliation = rec;
            }
            return order;
        });

        if (!usePagination) {
            return res.status(200).json(orders);
        }

        const total = await Order.countDocuments(filter);
        return res.status(200).json({
            data: orders,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.log("Error in getOrderByArtisanId function in order.controller.js", err.message)
        return res.status(500).json({ message: "Error fetching artisan's orders" })
    }
}

export const updateOrderReview = async (req, res) => {
    const customerId = req.user.id;
    const { orderId } = req.params;
    const { comment, rating, tags, photos } = req.body;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating is required and must be between 1 and 5" });
    }

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Prevent duplicate reviews
        if (order.review && order.review.rating) {
            return res.status(400).json({ message: "You have already reviewed this order" });
        }

        // Verify the customer owns this order
        if (order.customerId.toString() !== customerId) {
            return res.status(403).json({ message: "You can only review your own orders" });
        }

        const reviewData = { customerId, comment, rating, tags: tags || [], photos: photos || [], createdAt: new Date() };

        const updatedOrder = await Order.findByIdAndUpdate(orderId, { review: reviewData }, { new: true });

        await Artisan.findByIdAndUpdate(order.artisanId, {
            $push: { reviews: reviewData }
        }, { new: true });

        return res.status(200).json(updatedOrder);
    } catch (err) {
        console.log("Error in updateOrderReview function in order.controller.js", err.message);
        return res.status(500).json({ message: "Error adding review to order" });
    }
}

export const updateOrderRepairStatus = async (req, res) => {
    const { orderId } = req.params;
    const { repairStatus } = req.body;
    try {
        let order = await Order.findByIdAndUpdate(orderId, { repairStatus }, { new: true });

        // Send email notification to customer on decline or delivery
        if (repairStatus === "declined" || repairStatus === "delivered") {
            try {
                const customer = await Customer.findById(order.customerId).populate("auth");
                const artisan = await Artisan.findById(order.artisanId);
                const artisanName = artisan ? `${artisan.firstName} ${artisan.lastName}` : "Your artisan";

                if (customer?.auth?.email) {
                    if (repairStatus === "declined") {
                        await sendEmail({
                            to: customer.auth.email,
                            subject: "Your Fixr booking has been declined",
                            html: `<p>Hi ${customer.firstName},</p>
                                   <p>Unfortunately, <strong>${artisanName}</strong> was unable to take your booking for: <em>${order.problem}</em>.</p>
                                   <p>Don't worry — you can easily find another verified artisan on Fixr to handle your repair.</p>
                                   <p>Log in to your dashboard to book a new artisan.</p>
                                   <p>— The Fixr Team</p>`
                        });
                    } else if (repairStatus === "delivered") {
                        await sendEmail({
                            to: customer.auth.email,
                            subject: "Your repair is complete! 🎉",
                            html: `<p>Hi ${customer.firstName},</p>
                                   <p>Great news! <strong>${artisanName}</strong> has completed your repair for: <em>${order.problem}</em>.</p>
                                   <p>We hope you're satisfied with the service. Please log in to leave a review and help other customers find great artisans!</p>
                                   <p>— The Fixr Team</p>`
                        });
                    }
                }
            } catch (mailErr) {
                console.error("Error sending status notification email to customer", mailErr);
            }
        }

        return res.status(200).json(order);
    } catch (err) {
        console.log("Error in updateOrderRepairStatus function in order.controller.js", err.message);
        return res.status(500).json({ message: "Error adding repair status to order" });
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

export const updateOrderPaymentStatus = async (req, res) => {
    const { orderId } = req.params;
    const artisanId = req.user.id;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Ensure the artisan owns this order
        if (order.artisanId.toString() !== artisanId) {
            return res.status(403).json({ message: "You can only update payment for your own orders" });
        }

        // Prevent double-confirming
        if (order.paymentStatus === "paid") {
            return res.status(400).json({ message: "Payment has already been confirmed for this order" });
        }

        order.paymentStatus = "paid";
        await order.save();

        // Send email receipt to customer + notify admin
        try {
            const customer = await Customer.findById(order.customerId).populate("auth");
            const artisan = await Artisan.findById(order.artisanId);
            const artisanName = artisan ? `${artisan.firstName} ${artisan.lastName}` : "Your artisan";
            const customerName = customer ? `${customer.firstName} ${customer.lastName}` : "Unknown";

            if (customer?.auth?.email) {
                await sendEmail({
                    to: customer.auth.email,
                    subject: "Payment confirmed for your Fixr repair",
                    html: `<p>Hi ${customer.firstName},</p>
                           <p>Your cash payment of <strong>₦${Number(order.repairFee || 0).toLocaleString()}</strong> has been confirmed by <strong>${artisanName}</strong>.</p>
                           <p>Repair: <em>${order.problem}</em></p>
                           <p>Thank you for using Fixr!</p>
                           <p>— The Fixr Team</p>`
                });
            }

            // Notify admin
            const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
            if (adminEmail) {
                await sendEmail({
                    to: adminEmail,
                    subject: `💰 Cash Payment Confirmed — ₦${Number(order.repairFee || 0).toLocaleString()}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                            <h2 style="color: #166534;">Payment Notification</h2>
                            <p>A cash payment has been confirmed on Fixr.</p>
                            <div style="background-color: #F0FDF4; border: 1px solid #DCFCE7; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                <p style="margin: 4px 0;"><strong>Customer:</strong> ${customerName}</p>
                                <p style="margin: 4px 0;"><strong>Artisan:</strong> ${artisanName}</p>
                                <p style="margin: 4px 0;"><strong>Amount:</strong> ₦${Number(order.repairFee || 0).toLocaleString()}</p>
                                <p style="margin: 4px 0;"><strong>Method:</strong> Cash</p>
                                <p style="margin: 4px 0;"><strong>Order ID:</strong> ${orderId}</p>
                            </div>
                            <p style="font-size: 14px; color: #64748B;">— Fixr System</p>
                        </div>
                    `
                });
            }
        } catch (mailErr) {
            console.error("Error sending payment confirmation email", mailErr);
        }

        return res.status(200).json(order);
    } catch (err) {
        console.log("Error in updateOrderPaymentStatus function in order.controller.js", err.message);
        return res.status(500).json({ message: "Error confirming payment" });
    }
}

export const getOrderById = async (req, res) => {
    const { orderId } = req.params;
    const userId = req.user?.id;

    if (!orderId) {
        return res.status(400).json({ message: "Order ID is required" });
    }

    try {
        const order = await Order.findById(orderId)
            .populate("artisanId")
            .populate("customerId")
            .lean();

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const customerId = order.customerId?._id?.toString() || order.customerId?.toString();
        const artisanId = order.artisanId?._id?.toString() || order.artisanId?.toString();

        if (!userId || (userId !== customerId && userId !== artisanId)) {
            return res.status(403).json({ message: "Access denied" });
        }

        return res.status(200).json(order);
    } catch (err) {
        console.log("Error in getOrderById function in order.controller.js", err.message);
        return res.status(500).json({ message: "Error fetching order" });
    }
};

const getPagination = (query = {}) => {
    const rawPage = Number(query.page);
    const rawLimit = Number(query.limit);
    const usePagination = Number.isFinite(rawPage) || Number.isFinite(rawLimit);

    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
    const skip = (page - 1) * limit;

    return { page, limit, skip, usePagination };
};

const buildSelect = (fields) => {
    if (!fields) return null;
    const cleaned = String(fields)
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean);

    if (cleaned.length === 0) return null;
    if (!cleaned.includes("_id")) cleaned.unshift("_id");
    return cleaned.join(" ");
};

const buildOrderFilter = ({ ownerKey, ownerId, query = {} }) => {
    const filter = { [ownerKey]: ownerId };

    if (query.status) {
        const statuses = String(query.status)
            .split(",")
            .map((status) => status.trim().toLowerCase())
            .filter(Boolean);

        if (statuses.length === 1) {
            filter.repairStatus = statuses[0];
        } else if (statuses.length > 1) {
            filter.repairStatus = { $in: statuses };
        }
    }

    if (query.search) {
        const term = escapeRegex(query.search);
        const regex = new RegExp(term, "i");
        const orFilters = [
            { problem: regex },
            { location: regex }
        ];

        if (mongoose.Types.ObjectId.isValid(query.search)) {
            orFilters.push({ _id: query.search });
        }

        filter.$or = orFilters;
    }

    return filter;
};

const escapeRegex = (value) => {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
