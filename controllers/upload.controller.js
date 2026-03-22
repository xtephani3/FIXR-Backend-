import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';

export const generateSignature = async (req, res) => {
    try {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudName || !apiKey || !apiSecret) {
            return res.status(500).json({ message: "Cloudinary configuration is missing in the environment." });
        }

        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret
        });

        // Optional: you can extract folder or resource_type from req.body if you want
        const timestamp = Math.round((new Date).getTime() / 1000);
        
        // Let's create a unique ID for public_id to be safe
        const { fileName } = req.body;
        // sanitize filename
        const public_id = fileName 
            ? `${crypto.randomUUID()}-${fileName.split('.')[0]}` 
            : crypto.randomUUID();

        const paramsToSign = {
            timestamp,
            public_id
        };

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            apiSecret
        );

        return res.status(200).json({
            signature,
            timestamp,
            cloudName,
            apiKey,
            public_id
        });

    } catch (error) {
        console.error("Error generating signature:", error);
        return res.status(500).json({ message: "Error generating signature", error: error.message });
    }
};
