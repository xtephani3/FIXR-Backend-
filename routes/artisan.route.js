import express from "express";

import Admin from "../models/admin.model.js";

import { verifyAccessByLogin, verifyAccessByModel } from "../middlewares/verification.js";
import { getAllArtisan, getArtisanById, updateArtisanStatus, deleteArtisanById } from "../controllers/artisan.controller.js";

const router = express.Router();

router.get("/", verifyAccessByLogin, getAllArtisan)
router.get("/artisanId", verifyAccessByLogin, getArtisanById)
router.patch("/status", verifyAccessByModel(Admin), updateArtisanStatus)
router.delete("/delete", verifyAccessByModel(Admin), deleteArtisanById)

export default router;
