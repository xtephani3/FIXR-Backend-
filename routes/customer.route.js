import express from "express";

import Admin from "../models/admin.model.js";
import Customer from "../models/customer.model.js";

import { verifyAccessByModel, verifyAccessByLogin } from "../middlewares/verification.js";
import { getAllCustomer, getCustomerById, updateProfile, changePassword, deleteAccount, updateRealtimeLocation } from "../controllers/customer.controller.js";

const router = express.Router();

router.get("/", verifyAccessByModel(Admin), getAllCustomer)
router.get("/:id", verifyAccessByLogin, getCustomerById)
router.patch("/settings/profile", verifyAccessByModel(Customer), updateProfile)
router.patch("/settings/change-password", verifyAccessByModel(Customer), changePassword)
router.delete("/settings/delete-account", verifyAccessByModel(Customer), deleteAccount)
router.post("/realtime-location", updateRealtimeLocation)

export default router;
