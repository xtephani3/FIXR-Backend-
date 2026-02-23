import { hashPassword, handleLogin, handleLogout } from "../utils/util.js";

import Auth from "../models/auth.model.js";
import Customer from "../models/customer.model.js";
import Artisan from "../models/artisan.model.js";
import Admin from "../models/admin.model.js";

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