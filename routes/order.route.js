import express from "express";

import Customer from "../models/customer.model.js";
import Artisan from "../models/artisan.model.js";

import { verifyAccessByLogin, verifyAccessByModel } from "../middlewares/verification.js";
import { createOrderByCustomer, getOrderByCustomerId, getOrderByArtisanId, getOrderById, updateOrderReview, updateOrderRepairStatus, updateOrderRepairFee, updateOrderRepairReport, updateOrderPaymentStatus } from "../controllers/order.controller.js";

const router = express.Router();

router.post("/", verifyAccessByModel(Customer), createOrderByCustomer)
router.get("/customer", verifyAccessByModel(Customer), getOrderByCustomerId)
router.get("/artisan", verifyAccessByModel(Artisan), getOrderByArtisanId)
router.get("/:orderId", verifyAccessByLogin, getOrderById)
router.patch("/:orderId/review", verifyAccessByModel(Customer), updateOrderReview)
router.patch("/:orderId/repair-status", verifyAccessByLogin, updateOrderRepairStatus)
router.patch("/:orderId/repair-fee", verifyAccessByModel(Artisan), updateOrderRepairFee)
router.patch("/:orderId/report", verifyAccessByModel(Artisan), updateOrderRepairReport)
router.patch("/:orderId/payment-status", verifyAccessByModel(Artisan), updateOrderPaymentStatus)

export default router;
