import { hashPassword, handleLogin, handleLogout } from "../utils/util.js";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from "resend";
import bcrypt from "bcryptjs";

import Auth from "../models/auth.model.js";
import Customer from "../models/customer.model.js";
import Artisan from "../models/artisan.model.js";
import Admin from "../models/admin.model.js";

const isProduction = process.env.NODE_ENV === "production";
const resend = new Resend(process.env.RESEND_API_KEY);

export const customerSignUp = async (req, res) => {
    const { firstName, lastName, phoneNumber, email, password } = req.body;

    if (!firstName || !lastName || !phoneNumber || !email || !password) {
        return res.status(400).json({ message: "Fill all fields" })
    }

    const existingAccount = await Auth.findOne({ email })
    if (existingAccount) {
        return res.status(409).json({ message: "Account exists" })
    }

    try {
        const hashedPassword = hashPassword(password);

        const newCustomer = new Customer({
            firstName, lastName, phoneNumber
        })
        await newCustomer.save()

        const customerID = newCustomer._id
        const auth = Auth({
            email,
            password: hashedPassword,
            userId: customerID,
            userModel: "Customer"
        })
        await auth.save()

        //link auth details to corresponding user
        newCustomer.auth = auth._id;
        await newCustomer.save();

        if (process.env.RESEND_API_KEY) {
            try {
                await resend.emails.send({
                    from: 'Fixr Welcome Team <onboarding@resend.dev>',
                    to: [email],
                    subject: 'Welcome to Fixr! 🎉',
                    html: `<p>Hi ${firstName}! Thanks for joining Fixr. We are excited to help you fix things instead of replacing them!</p>`
                });
            } catch (e) {
                console.error("Error sending welcome email", e);
            }
        }

        return res.status(201).json("Account created!", newCustomer)
    } catch (err) {
        console.log("Error in customerSignUp function in auth.controller.js")
        return res.status(500).json({ message: "Error in signing up customer" } || "Server error")
    }
}
export const customerLogin = async (req, res) => {
    const login = handleLogin(Customer)
    login(req, res)
}
export const customerLogout = async (req, res) => {
    const customerId = req.user.id;
    const logout = handleLogout(Customer, customerId)
    logout(req, res)
}

export const artisanSignUp = async (req, res) => {
    //console.log(req.files)
  
    const { firstName, lastName, phoneNumber, email, password, city, state, serviceRendered, serviceDescription } = req.body;

    if (!firstName || !lastName || !phoneNumber || !email || !password || !city || !state || !serviceRendered || !serviceDescription) {
        return res.status(400).json({ message: "Fill all fields" })
    }

    const existingAccount = await Auth.findOne({ email })
    if (existingAccount) {
        return res.status(409).json({ message: "Account exists" })
    }

    try {
        const hashedPassword = hashPassword(password);

        const newArtisan = new Artisan({
            firstName,
            lastName,
            phoneNumber,
            city,
            state,
            serviceRendered,
            serviceDescription,
            passportImg: req.files.passportImg?.[0].filename,
            cv: req.files.cv?.[0].filename
        })
        await newArtisan.save()

        const artisanID = newArtisan._id
        const auth = Auth({
            email,
            password: hashedPassword,
            userId: artisanID,
            userModel: "Artisan"
        })
        await auth.save()

        //link auth details to corresponding user
        newArtisan.auth = auth._id;
        await newArtisan.save();

        if (process.env.RESEND_API_KEY) {
            try {
                await resend.emails.send({
                    from: 'Fixr Artisan Team <artisans@resend.dev>',
                    to: [email],
                    subject: 'Welcome to Fixr Artisans! 🛠️',
                    html: `<p>Hi ${firstName}! Thanks for joining the Fixr network. Your skills are an invaluable asset.</p>`
                });
            } catch (e) {
                console.error("Error sending artisan welcome email", e);
            }
        }

        return res.status(201).json("Account created!", newArtisan)
    } catch (err) {
        console.log("Error in artisanSignUp function in auth.controller.js", err.message)
        return res.status(500).json({ message: "Error in signing up artisan" } || "Server error")
    }
}

export const artisanLogin = async (req, res) => {
   const login =  handleLogin(Artisan)
   login(req, res)
}
export const artisanLogout = async (req, res) => {
    const artisanId = req.user.id;
    const logout = handleLogout(Artisan, artisanId)
    logout(req,res)
}

export const adminSignUp = async (req, res) => {
    const { firstName, lastName, email, password} = req.body;

    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "Fill all fields" })
    }

    const existingAccount = await Auth.findOne({ email })
    if (existingAccount) {
        return res.status(409).json({ message: "Account exists" })
    }
  
    try {
        const hashedPassword = hashPassword(password);

        const newAdmin = new Admin({
            firstName, lastName, userModel: "Admin"
        })
        await newAdmin.save()

        const adminID = newAdmin._id
        const auth = Auth({
            email,
            password: hashedPassword,
            userId: adminID,
            userModel: "Admin"
        })
        await auth.save()

        //link auth details to corresponding user
        newAdmin.auth = auth._id;
        await newAdmin.save();

        return res.status(201).json("Account created!", newAdmin)
    } catch (err) {
        console.log("Error in adminSignUp function in auth.controller.js", err.message)
        return res.status(500).json({ message: "Error signing up admin" } || "Server error")
    }
}
export const adminLogin = async (req, res) => {
    const login = handleLogin(Admin)
    login(req, res)
}
export const adminLogout = async (req, res) => {
    const adminId = req.user.id;
    const logout = handleLogout(Admin, adminId)
    logout(req, res)
}

export const googleLogin = async (req, res) => {
    const { token, userModel } = req.body; // userModel should be "Customer" or "Artisan"
    
    if (!token) {
        return res.status(400).json({ message: "Google token is required" });
    }

    try {
        // Fetch user profile from Google using the access_token directly
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        client.setCredentials({ access_token: token });
        
        const oauth2Response = await client.request({
            url: "https://www.googleapis.com/oauth2/v3/userinfo"
        });
        
        const payload = oauth2Response.data;
        const { sub: googleId, email, given_name: firstName, family_name: lastName } = payload;

        let existingAccount = await Auth.findOne({ email });

        if (!existingAccount) {
            // New user registration flow via Google
            if (!userModel || !["Customer", "Artisan"].includes(userModel)) {
                return res.status(400).json({ message: "Valid userModel is required for Google signup" });
            }

            let newUserDetails;
            if (userModel === "Customer") {
                const newCustomer = new Customer({
                    firstName: firstName || "",
                    lastName: lastName || "",
                    loggedIn: true
                });
                await newCustomer.save();
                newUserDetails = newCustomer;
            } else if (userModel === "Artisan") {
                const newArtisan = new Artisan({
                    firstName: firstName || "",
                    lastName: lastName || "",
                    loggedIn: true
                });
                await newArtisan.save();
                newUserDetails = newArtisan;
            }

            // Create Auth document for Google OAuth
            existingAccount = new Auth({
                email,
                userId: newUserDetails._id,
                userModel,
                authProvider: "google",
                googleId
            });
            await existingAccount.save();

            newUserDetails.auth = existingAccount._id;
            await newUserDetails.save();
        } else {
            // For an existing user, update loggedIn status to true
            try {
               let AccountModel;
               if (existingAccount.userModel === "Customer") AccountModel = Customer;
               if (existingAccount.userModel === "Artisan") AccountModel = Artisan;
               if (existingAccount.userModel === "Admin") AccountModel = Admin;

               if (AccountModel) {
                   const accountDetails = await AccountModel.findById(existingAccount.userId);
                   if (accountDetails) {
                       accountDetails.loggedIn = true;
                       await accountDetails.save();
                   }
               }
            } catch (err) {
                console.log("Error updating loggedin status:", err);
            }
        }

        const sessionToken = jwt.sign({
            id: existingAccount.userId, email: existingAccount.email
        }, process.env.JWT_SECRET);

        res.cookie("stored_token", sessionToken, {
            path: "/",
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax"
        });

        let FinalModel;
        if (existingAccount.userModel === "Customer") FinalModel = Customer;
        else if (existingAccount.userModel === "Artisan") FinalModel = Artisan;
        else FinalModel = Admin;

        const returnedAccountDetails = await FinalModel.findById(existingAccount.userId);

        return res.status(200).json({ message: "Login successful", accountDetails: returnedAccountDetails });

    } catch (err) {
        console.error("Error in googleLogin:", err);
        return res.status(500).json({ message: "Error authenticating with Google", error: err.message, stack: err.stack });
    }
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    try {
        const auth = await Auth.findOne({ email });
        if (!auth) {
            // Return 200 anyway so we don't leak user emails, standard security practice
            return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
        }

        // Generate token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hash = await bcrypt.hash(resetToken, 10);

        auth.resetPasswordToken = hash;
        auth.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await auth.save();

        // Send email
        const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password/${resetToken}?email=${encodeURIComponent(email)}`;
        
         if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'Fixr Security <security@resend.dev>',
                to: [email],
                subject: 'Fixr Password Reset Request',
                html: `
                    <p>You requested a password reset. Please click the link below to set a new password:</p>
                    <a href="${resetUrl}">${resetUrl}</a>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                `
            });
         }

        return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
    } catch (err) {
        console.error("Error in forgotPassword:", err);
        return res.status(500).json({ message: "Error processing forgot password request" });
    }
};

export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const auth = await Auth.findOne({ 
            email, 
            resetPasswordExpires: { $gt: Date.now() } 
        });

        if (!auth || !auth.resetPasswordToken) {
            return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        const isValid = await bcrypt.compare(token, auth.resetPasswordToken);
        if (!isValid) {
            return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        auth.password = hashPassword(newPassword);
        auth.resetPasswordToken = undefined;
        auth.resetPasswordExpires = undefined;
        await auth.save();

        return res.status(200).json({ message: "Password has been successfully reset" });
    } catch (err) {
        console.error("Error in resetPassword:", err);
        return res.status(500).json({ message: "Error resetting password" });
    }
};