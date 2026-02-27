import {
    BlobServiceClient,
    generateBlobSASQueryParameters,
    BlobSASPermissions,
    StorageSharedKeyCredential
} from "@azure/storage-blob";
import crypto from "crypto";

export const generateSasToken = async (req, res) => {
    try {
        const { fileName, fileType, fileSize } = req.body;

        if (!fileName || !fileType || !fileSize) {
            return res.status(400).json({ message: "fileName, fileType, and fileSize are required" });
        }

        // File validation
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(fileType)) {
            return res.status(400).json({ message: "Invalid file type. Only JPG, PNG, WEBP, PDF, and DOC are allowed" });
        }

        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (fileSize > MAX_FILE_SIZE) {
            return res.status(400).json({ message: "File size exceeds 10MB limit" });
        }

        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

        if (!accountName || !accountKey || !containerName) {
            return res.status(500).json({ message: "Azure Storage configuration is missing in the environment." });
        }

        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
        const blobServiceClient = new BlobServiceClient(
            `https://${accountName}.blob.core.windows.net`,
            sharedKeyCredential
        );

        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Generate unique filename as requested
        const uniqueFilename = `${crypto.randomUUID()}-${fileName}`;
        const blobClient = containerClient.getBlobClient(uniqueFilename);

        const sasOptions = {
            containerName,
            blobName: uniqueFilename,
            permissions: BlobSASPermissions.parse("racw"), // Read, Add, Create, Write
            startsOn: new Date(),
            expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // Expires in 1 hour
        };

        const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
        const sasUrl = `${blobClient.url}?${sasToken}`;

        return res.status(200).json({
            sasUrl,
            blobUrl: blobClient.url, // Use this URL to save into db after uploading
            filename: uniqueFilename
        });

    } catch (error) {
        console.error("Error generating SAS:", error);
        return res.status(500).json({ message: "Error generating SAS token", error: error.message });
    }
};
