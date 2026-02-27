import express from "express";
import { aiChat, aiMatch } from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/chat", aiChat);
router.post("/match", aiMatch);

export default router;
