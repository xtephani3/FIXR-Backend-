import express from "express";
import { getMessagesByOrder, sendMessage } from "../controllers/chat.controller.js";
import { verifyAccessByLogin } from "../middlewares/verification.js";
import { upload } from "../utils/util.js";

const router = express.Router();

router.get("/:orderId", verifyAccessByLogin, getMessagesByOrder);
router.post("/:orderId", verifyAccessByLogin, upload.single("image"), sendMessage);

export default router;
