import express from "express";
import { generateSasToken } from "../controllers/upload.controller.js";

const router = express.Router();

router.post("/sas", generateSasToken);

export default router;
