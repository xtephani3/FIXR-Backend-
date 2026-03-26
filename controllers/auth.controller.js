import { hashPassword, handleLogin, handleLogout } from "../utils/util.js";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import Auth from "../models/auth.model.js";
import Customer from "../models/customer.model.js";
import Artisan from "../models/artisan.model.js";
import Admin from "../models/admin.model.js";
import sendEmail from "../utils/email.js";

const isProduction = process.env.NODE_ENV === "production";

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

        await sendEmail({
            to: email,
            subject: 'Welcome to the Fixr Family! 🛠️',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                    <h2 style="color: #166534;">Hi ${firstName},</h2>

                    <p>We are thrilled to have you here! Finding a reliable, skilled artisan shouldn't be a headache. Whether you need a quick fix at home, a custom-made piece of furniture, or a professional service, <strong>Fixr</strong> connects you with the best local hands in minutes.</p>

                    <h3 style="color: #166534;">🛠️ How it Works</h3>
                    <ul style="padding-left: 20px;">
                        <li style="margin-bottom: 8px;"><strong>Search & Discover:</strong> Browse through verified artisans near you and check out their portfolios and reviews.</li>
                        <li style="margin-bottom: 8px;"><strong>Book with Confidence:</strong> Select a service, pick a time that works for you, and get matched instantly.</li>
                        <li style="margin-bottom: 8px;"><strong>Job Well Done:</strong> Sit back while your artisan gets to work!</li>
                    </ul>

                    <h3 style="color: #166534;">💳 Flexible Payment Options</h3>
                    <p>We want to make your experience as smooth as possible, which is why we offer two ways to pay:</p>
                    <ul style="padding-left: 20px;">
                        <li style="margin-bottom: 8px;"><strong>Pay Online (Powered by Flutterwave):</strong> Securely pay via card or bank transfer directly through the app. It's fast, encrypted, and hassle-free.</li>
                        <li style="margin-bottom: 8px;"><strong>Pay with Cash:</strong> Prefer the traditional way? You can pay your artisan in person once the job is completed to your satisfaction.</li>
                    </ul>

                    <h3 style="color: #166534;">🛡️ Your Safety is Our Priority</h3>
                    <p>Every artisan on our platform undergoes a thorough verification process. We also encourage you to rate and review your experience after every job to help us maintain the highest standards of quality.</p>

                    <h3 style="color: #166534;">Ready to get started?</h3>
                    <p>Your first project is just a few taps away. Log in now to explore artisans in your area!</p>
                    
                    <div style="text-center; margin: 30px 0;">
                        <a href="${process.env.CLIENT_URL || 'https://fixr.ng'}" style="background-color: #166534; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open the App</a>
                    </div>

                    <p>If you ever need a hand or have questions, our support team is always here for you. Happy building, fixing, and creating!</p>

                    <p style="margin-top: 24px;">Best regards,<br/><strong>The Fixr Team</strong></p>
                </div>
            `
        });

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
  
    const { firstName, lastName, phoneNumber, email, password, city, state, serviceRendered, serviceDescription, passportImg, cv } = req.body;

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
            passportImg,
            cv
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

        await sendEmail({
            to: email,
            subject: 'Welcome to the Fixr Family! | Let\'s get you started 🛠️',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                    <h2 style="color: #166534;">Hi ${firstName},</h2>

                    <p>Welcome to <strong>Fixr</strong>! We are thrilled to have you join our community of skilled professionals. Our mission is to connect your expertise with customers who need your services, helping you grow your business and manage your bookings seamlessly.</p>

                    <h3 style="color: #166534;">🚀 Getting Started</h3>
                    <p>Your profile is now live! Customers in your area can browse your services, view your portfolio, and book you for jobs.</p>

                    <h3 style="color: #166534;">💳 Payment Options</h3>
                    <p>We've made it easy for you to get paid. Your customers have two ways to settle their bills:</p>
                    <ul>
                        <li><strong>Flutterwave:</strong> Secure, instant online payments.</li>
                        <li><strong>Cash:</strong> For customers who prefer to pay you directly in person.</li>
                    </ul>

                    <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <h4 style="color: #92400E; margin-top: 0;">⚠️ Important: Reconciliation Fee</h4>
                        <p style="margin-bottom: 8px;">To keep the platform running and continue bringing you new leads, a small service fee (reconciliation fee) is charged on every successful booking.</p>
                        <p style="margin-bottom: 8px;">If a customer pays via <strong>Flutterwave</strong>, this fee is automatically handled. However, if a customer pays you in <strong>cash</strong>, you are required to manually remit the reconciliation fee to the following account:</p>
                        <div style="background-color: white; padding: 12px; border-radius: 6px; margin: 12px 0;">
                            <p style="margin: 4px 0;"><strong>Bank Name:</strong> First Bank of Nigeria</p>
                            <p style="margin: 4px 0;"><strong>Account Name:</strong> Fixr Technologies Ltd</p>
                            <p style="margin: 4px 0;"><strong>Account Number:</strong> 0123456789</p>
                        </div>
                        <p style="font-size: 14px; color: #92400E;">Please include your <strong>Booking ID</strong> or <strong>Registered Phone Number</strong> in the payment description to ensure your account remains in good standing.</p>
                    </div>

                    <h3 style="color: #166534;">💡 Pro Tips for Success</h3>
                    <ul>
                        <li><strong>Keep your profile updated:</strong> High-quality photos of your work attract 3x more customers.</li>
                        <li><strong>Respond quickly:</strong> Fast responses lead to higher ratings and more bookings.</li>
                        <li><strong>Confirm payments:</strong> Always mark a job as "Paid" in the app once you receive cash.</li>
                    </ul>

                    <p>If you have any questions, simply reply to this email or visit our Help Center in the app.</p>

                    <p>We can't wait to see your business thrive!</p>

                    <p style="margin-top: 24px;">Best regards,<br/><strong>The Fixr Team</strong></p>
                </div>
            `
        });

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
        
         await sendEmail({
             to: email,
             subject: 'Fixr Password Reset Request',
             html: `
                 <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                     <div style="background-color: #166534; padding: 24px; text-align: center;">
                         <h2 style="color: white; margin: 0; letter-spacing: 1px;">Fixr Password Reset</h2>
                     </div>
                     <div style="padding: 32px;">
                         <p style="font-size: 16px;">Hello,</p>
                         <p style="font-size: 16px;">We received a request to reset your password. You can do this by clicking the button below:</p>
                         
                         <div style="text-align: center; margin: 32px 0;">
                             <a href="${resetUrl}" style="background-color: #166534; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Reset Your Password</a>
                         </div>
                         
                         <p style="font-size: 14px; color: #4B5563; background-color: #F3F4F6; padding: 12px; border-radius: 6px;">
                             If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                         </p>
                         
                         <p style="margin-top: 32px; font-size: 14px; color: #6B7280; border-top: 1px solid #E5E7EB; padding-top: 16px;">
                             If the button doesn't work, copy and paste this link into your browser:<br/>
                             <a href="${resetUrl}" style="color: #166534; word-break: break-all;">${resetUrl}</a>
                         </p>
                     </div>
                 </div>
             `
         });

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