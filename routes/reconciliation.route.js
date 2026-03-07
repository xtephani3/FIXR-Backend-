import express from "express";

import Artisan from "../models/artisan.model.js";
import Admin from "../models/admin.model.js";

import { verifyAccessByModel } from "../middlewares/verification.js";
import { submitReconciliation, getReconciliations, updateReconciliationStatus } from "../controllers/reconciliation.controller.js";

const router = express.Router();

// Artisan routes
router.post("/:orderId", verifyAccessByModel(Artisan), submitReconciliation);

// Admin routes
router.get("/", verifyAccessByModel(Admin), getReconciliations);
router.patch("/:id/status", verifyAccessByModel(Admin), updateReconciliationStatus);

export default router;
