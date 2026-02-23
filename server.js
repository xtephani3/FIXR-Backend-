//import helmet from "helmet";
import express from "express";
import cors from "cors";
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

conDB();
dotenv.config();
const PORT = process.env.PORT || 5000;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// app.use(helmet());

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/admin", adminRoute)
app.use("/api/artisan", artisanRoute)
app.use("/api/auth", authRoute)
app.use("/api/customer", customerRoute)
app.use("/api/order", orderRoute)
app.use("/api/payment", paymentRoute)
app.use("/api/chat", chatRoute)


app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port", PORT)
});