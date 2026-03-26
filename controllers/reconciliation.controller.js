import Reconciliation from "../models/reconciliation.model.js";
import Order from "../models/order.model.js";
import Artisan from "../models/artisan.model.js";
import sendEmail from "../utils/email.js";

// @route   POST /api/reconciliation/:orderId
// @desc    Artisan submits reconciliation fee receipt
// @access  Artisan
export const submitReconciliation = async (req, res) => {
    const { orderId } = req.params;
    const artisanId = req.user.id;
    const { amount, receiptUrl } = req.body;

    if (!amount || !receiptUrl) {
        return res.status(400).json({ message: "Amount and receipt image are required" });
    }

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.artisanId.toString() !== artisanId) {
            return res.status(403).json({ message: "You can only submit reconciliation for your own orders" });
        }

        // Check if an active/pending reconciliation already exists
        const existingRec = await Reconciliation.findOne({ orderId, status: "pending" });
        if (existingRec) {
            return res.status(400).json({ message: "A reconciliation request is already pending for this order" });
        }

        const reconciliation = new Reconciliation({
            orderId,
            artisanId,
            amount,
            receiptUrl
        });

        await reconciliation.save();

        // Optionally notify admin
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
        if (adminEmail) {
            try {
                const artisan = await Artisan.findById(artisanId);
                const artisanName = artisan ? `${artisan.firstName} ${artisan.lastName}` : "An artisan";
                await sendEmail({
                    to: adminEmail,
                    subject: `New Reconciliation Submission — ₦${Number(amount).toLocaleString()}`,
                    html: `<p>${artisanName} has submitted a reconciliation fee receipt for Order ${orderId}.</p>
                           <p>Amount: ₦${Number(amount).toLocaleString()}</p>
                           <p>Please log in to the admin dashboard to review and approve it.</p>`
                });
            } catch (mailErr) {
                console.error("Error notifying admin of new reconciliation", mailErr);
            }
        }

        return res.status(201).json(reconciliation);
    } catch (err) {
        console.error("Error in submitReconciliation:", err);
        return res.status(500).json({ message: "Error submitting reconciliation" });
    }
};

// @route   GET /api/reconciliation
// @desc    Get all reconciliation submissions (optionally filtered by status)
// @access  Admin
export const getReconciliations = async (req, res) => {
    const { status } = req.query; // ?status=pending
    const filter = status ? { status } : {};

    try {
        const reconciliations = await Reconciliation.find(filter)
            .populate({
                path: 'artisanId',
                select: 'firstName lastName phoneNumber auth',
                populate: { path: 'auth', select: 'email' }
            })
            .populate("orderId", "problem repairFee paymentStatus")
            .sort({ createdAt: -1 });
            
        return res.status(200).json(reconciliations);
    } catch (err) {
        console.error("Error in getReconciliations:", err);
        return res.status(500).json({ message: "Error fetching reconciliations" });
    }
};

// @route   PATCH /api/reconciliation/:id/status
// @desc    Admin confirms or rejects reconciliation
// @access  Admin
export const updateReconciliationStatus = async (req, res) => {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!["confirmed", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'confirmed' or 'rejected'" });
    }

    try {
        const reconciliation = await Reconciliation.findById(id).populate({
            path: 'artisanId',
            populate: { path: 'auth' }
        });
        if (!reconciliation) {
            return res.status(404).json({ message: "Reconciliation record not found" });
        }

        reconciliation.status = status;
        if (adminNote) {
            reconciliation.adminNote = adminNote;
        }

        await reconciliation.save();

        // Notify Artisan
        if (reconciliation.artisanId && reconciliation.artisanId.auth && reconciliation.artisanId.auth.email) {
            try {
                const artisan = reconciliation.artisanId;
                const isConfirmed = status === "confirmed";
                
                const loginUrlArtisan = `${process.env.CLIENT_URL || 'https://fixrr.vercel.app'}/artisan-dashboard`;
                let htmlMessage = `
                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                        <h2 style="color: #166534;">Hi ${artisan.firstName},</h2>`;
                        
                if (isConfirmed) {
                    htmlMessage += `
                        <p>Great news! Your reconciliation fee payment of <strong>₦${Number(reconciliation.amount).toLocaleString()}</strong> for Order #${reconciliation.orderId} has been <strong style="color: #15803D;">confirmed</strong>.</p>
                        <p>Thank you for keeping your account in good standing and being a valuable part of the Fixr community!</p>
                        <div style="margin: 30px 0;">
                            <a href="${loginUrlArtisan}" style="background-color: #166534; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View your Dashboard</a>
                        </div>`;
                } else {
                    htmlMessage += `
                        <p>Your reconciliation fee payment of <strong>₦${Number(reconciliation.amount).toLocaleString()}</strong> for Order #${reconciliation.orderId} was <strong style="color: #DC2626;">rejected</strong>.</p>`;
                    if (adminNote) {
                        htmlMessage += `
                        <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0; color: #991B1B;"><strong>Admin Note:</strong> ${adminNote}</p>
                        </div>`;
                    }
                    htmlMessage += `
                        <p>Please log in to your dashboard to submit a valid receipt or contact support if you need help.</p>
                        <div style="margin: 30px 0;">
                            <a href="${loginUrlArtisan}" style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Log in to resolve this issue</a>
                        </div>`;
                }
                
                htmlMessage += `
                        <p>Best regards,<br/><strong>The Fixr Team</strong></p>
                    </div>`;

                await sendEmail({
                    to: artisan.auth.email,
                    subject: `Reconciliation Payment ${isConfirmed ? 'Confirmed 🎉' : 'Rejected ⚠️'}`,
                    html: htmlMessage
                });
            } catch (mailErr) {
                console.error("Error notifying artisan of reconciliation status", mailErr);
            }
        }

        return res.status(200).json(reconciliation);
    } catch (err) {
        console.error("Error in updateReconciliationStatus:", err);
        return res.status(500).json({ message: "Error updating reconciliation status" });
    }
};
