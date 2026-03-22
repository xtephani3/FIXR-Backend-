import Artisan from "../models/artisan.model.js";
import Auth from "../models/auth.model.js"

//when filtering by location or sending aritsan to customer, send only approved artisans (application status)
export const getAllArtisan = async (req, res) => {
    try {
        const allArtisans = await Artisan.find().populate("auth", "email -_id");
        return res.status(200).json(allArtisans)
    } catch (error) {
        console.log("Error in getAllArtisan function in artisan.controller.js", error.message)
        res.status(500).json({message: "Error fetching artisans"})
    }
}

export const getArtisanById = async (req, res) => {
    const artisanId = req.body.id

    if (!artisanId) {
        return res.status(400).json({ message: "Provide artisan Id"});
    }

    try {
        const artisan = await Artisan.findById(artisanId).populate("auth", "email")
        if (!artisan) {
            return res.status(400).json({ message: "Artisan Not Found!" });
        }
        return res.status(200).json(artisan)
    } catch (error) {
        console.log("Error in getArtisanById function in artisan.controller.js", error.message)
        res.status(500).json({message: "Error fetching admin data"})
    }
}

export const updateArtisanStatus = async (req, res) => {
    const artisanId = req.body.id
    const newStatus = req.body.status || "approved";

    if (!artisanId) {
        return res.status(400).json({ message: "Provide artisan Id"});
    }

    try {
        const artisan = await Artisan.findByIdAndUpdate(artisanId, {applicationStatus: newStatus}, {new: true})
        if (!artisan) {
            return res.status(400).json({ message: "Artisan Not Found!" });
        }
        return res.status(200).json(artisan)
    } catch (error) {
        console.log("Error in updateArtisanStatus function in artisan.controller.js", error.message)
        res.status(500).json({message: "Error updating artisan status"})
    }
}
export const deleteArtisanById = async (req, res) => {
    let {artisanId} = req.body.id;

    if (!artisanId) {
        return res.status(400).json({ message: "Provide artisan Id"});
    }

    try {
        await Auth.findOneAndDelete({ artisanId })
        await Artisan.findByIdAndDelete(artisanId);

        return res.status(200).json({ message: "Artisan deleted" })
    } catch (error) {
        console.log("Error in deleteArtisanById function in artisan.controller.js", error.message)
        res.status(500).json({ message: "Error in deleting artisan"})
    }
}
