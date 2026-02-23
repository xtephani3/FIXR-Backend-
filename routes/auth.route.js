import express from "express";

const router = express.Router();

import Customer from "../models/customer.model.js";
import Artisan from "../models/artisan.model.js";
import Admin from "../models/admin.model.js";

import { verifyAccessByModel } from "../middlewares/verification.js";
import { customerSignUp, customerLogin, customerLogout, adminSignUp, adminLogin, adminLogout, artisanSignUp, artisanLogin, artisanLogout } from "../controllers/auth.controller.js";
import { getMe } from "../controllers/me.controller.js";
import { upload } from "../utils/util.js";

router.post("/customer-signup", customerSignUp)
router.post("/customer-login", customerLogin)
router.post("/customer-logout", verifyAccessByModel(Customer), customerLogout)

router.post("/artisan-signup", upload.fields([{ name: 'passportImg', maxCount: 1 }, { name: 'cv', maxCount: 1 }]), artisanSignUp)
router.post("/artisan-login", artisanLogin)
router.post("/artisan-logout", verifyAccessByModel(Artisan), artisanLogout)

router.post("/admin-signup", adminSignUp)
router.post("/admin-login", adminLogin)
router.post("/admin-logout", verifyAccessByModel(Admin), adminLogout)

// Session hydration – returns the currently logged-in user (any role)
router.get("/me", getMe)


export default router;