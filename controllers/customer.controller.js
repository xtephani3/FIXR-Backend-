import Customer from "../models/customer.model.js";

export const getAllCustomer = async (_req, res) => {
    try {
        const allCustomers = await Customer.find().populate("auth", "email -_id");
        return res.status(200).json(allCustomers);
    } catch (error) {
        console.log("Error in getAllCustomer function in customer.controller.js", error.message);
        res.status(500).json({ message: "Cannot get all customers" });
    }
};

export const getCustomerById = async (req, res) => {
    const customerId = req.params.id ?? req.body.id;

    if (!customerId) {
        return res.status(400).json({ message: "Provide a customerId" });
    }

    try {
        const customer = await Customer.findById(customerId).populate("auth", "email -_id");
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        return res.status(200).json(customer);  
    } catch (error) {
        console.log("Error in getCustomerById function in customer.controller.js", error.message);
        res.status(500).json({ message: error.message });
    }
};