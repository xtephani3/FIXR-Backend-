import express from "express";

import Admin from "../models/admin.model.js";

import { verifyAccessByModel, verifyAccessByLogin } from "../middlewares/verification.js";
import { getAllCustomer, getCustomerById } from "../controllers/customer.controller.js";

const router = express.Router();

router.get("/", verifyAccessByModel(Admin), getAllCustomer)
router.get("/:id", verifyAccessByLogin, getCustomerById)

export default router;
