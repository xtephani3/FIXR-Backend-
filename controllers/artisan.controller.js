import Artisan from "../models/artisan.model.js";
import Auth from "../models/auth.model.js"

//when filtering by location or sending aritsan to customer, send only approved artisans (application status)
export const getAllArtisan = async (req, res) => {
    try {
        const { page, limit, skip, usePagination } = getPagination(req.query);
        const selectFields = buildSelect(req.query.fields);
        const filter = await resolveArtisanFilter(req.query);

        let query = Artisan.find(filter);
        if (selectFields) {
            query = query.select(selectFields);
        }
        query = query.populate("auth", "email -_id");

        if (usePagination) {
            query = query.skip(skip).limit(limit);
        }

        const [artisans, total] = await Promise.all([
            query,
            usePagination ? Artisan.countDocuments(filter) : Promise.resolve(null)
        ]);

        if (!usePagination) {
            return res.status(200).json(artisans);
        }

        return res.status(200).json({
            data: artisans,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.log("Error in getAllArtisan function in artisan.controller.js", error.message)
        res.status(500).json({message: "Error fetching artisans"})
    }
}

export const getArtisanById = async (req, res) => {
    const artisanId = req.params.id ?? req.body.id

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

const getPagination = (query = {}) => {
    const rawPage = Number(query.page);
    const rawLimit = Number(query.limit);
    const usePagination = Number.isFinite(rawPage) || Number.isFinite(rawLimit);

    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
    const skip = (page - 1) * limit;

    return { page, limit, skip, usePagination };
};

const buildSelect = (fields) => {
    if (!fields) return null;
    const cleaned = String(fields)
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean);

    if (cleaned.length === 0) return null;
    if (!cleaned.includes("_id")) cleaned.unshift("_id");
    return cleaned.join(" ");
};

const buildArtisanFilter = (query = {}) => {
    const filter = {};
    if (query.status) {
        filter.applicationStatus = String(query.status).toLowerCase();
    }
    if (query.service) {
        filter.serviceRendered = String(query.service).toLowerCase();
    }
    if (query.state) {
        filter.state = new RegExp(`^${escapeRegex(query.state)}$`, "i");
    }
    if (query.city) {
        filter.city = new RegExp(`^${escapeRegex(query.city)}$`, "i");
    }
    if (query.search) {
        const term = escapeRegex(query.search);
        const regex = new RegExp(term, "i");
        filter.$or = [
            { firstName: regex },
            { lastName: regex },
            { serviceRendered: regex },
            { serviceDescription: regex }
        ];
    }
    return filter;
};

const resolveArtisanFilter = async (query = {}) => {
    const filter = buildArtisanFilter(query);

    if (query.email) {
        const regex = new RegExp(escapeRegex(query.email), "i");
        const authMatches = await Auth.find({ email: regex }).select("_id");
        filter.auth = { $in: authMatches.map((auth) => auth._id) };
    }

    return filter;
};

const escapeRegex = (value) => {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
