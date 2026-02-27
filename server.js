import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import conDB from "./utils/connectDB.js";

import adminRoute from "./routes/admin.route.js";
import artisanRoute from "./routes/artisan.route.js";
import authRoute from "./routes/auth.route.js";
import customerRoute from "./routes/customer.route.js";
import orderRoute from "./routes/order.route.js";
import paymentRoute from "./routes/payment.route.js";
import chatRoute from "./routes/chat.route.js";
import aiRoute from "./routes/ai.route.js";
import uploadRoute from "./routes/upload.route.js";

dotenv.config();
conDB();
const PORT = process.env.PORT;
const app = express();

// app.use(helmet());
app.use(cookieParser());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://lemon-field-085ef710f.4.azurestaticapps.net",
    "https://fixr-frontend-testing.onrender.com"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global rate limiter to prevent bot abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 minutes
  message: { message: "Too many requests from this IP, please try again later." }
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api", apiLimiter);

app.use("/api/admin", adminRoute)
app.use("/api/artisan", artisanRoute)
app.use("/api/auth", authRoute)
app.use("/api/customer", customerRoute)
app.use("/api/order", orderRoute)
app.use("/api/payment", paymentRoute)
app.use("/api/chat", chatRoute)
app.use("/api/ai", aiRoute)
app.use("/api/upload", uploadRoute)


app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port", PORT)
});
