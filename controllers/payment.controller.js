import Auth from "../models/auth.model.js";
import Customer from "../models/customer.model.js";
import Artisan from "../models/artisan.model.js";
import Payment from "../models/payment.model.js";
import Order from "../models/order.model.js";
import sendEmail from "../utils/email.js";

// Reusable helper to notify admin of a payment
const notifyAdminPayment = async ({ customerName, artisanName, amount, method, orderId }) => {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    if (!adminEmail) return;

    try {
        await sendEmail({
            to: adminEmail,
            subject: `💰 Payment Received — ₦${Number(amount || 0).toLocaleString()} (${method})`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                    <h2 style="color: #166534;">Payment Notification</h2>
                    <p>A payment has been ${method === "Cash" ? "confirmed" : "received"} on Fixr.</p>
                    <div style="background-color: #F0FDF4; border: 1px solid #DCFCE7; padding: 16px; border-radius: 8px; margin: 16px 0;">
                        <p style="margin: 4px 0;"><strong>Customer:</strong> ${customerName}</p>
                        <p style="margin: 4px 0;"><strong>Artisan:</strong> ${artisanName}</p>
                        <p style="margin: 4px 0;"><strong>Amount:</strong> ₦${Number(amount || 0).toLocaleString()}</p>
                        <p style="margin: 4px 0;"><strong>Method:</strong> ${method}</p>
                        <p style="margin: 4px 0;"><strong>Order ID:</strong> ${orderId}</p>
                    </div>
                    <p style="font-size: 14px; color: #64748B;">— Fixr System</p>
                </div>
            `
        });
    } catch (err) {
        console.error("Error notifying admin of payment:", err);
    }
};

export const getCustomerPaymentHistory = async (req, res) => {
  const customerId = req.user.id;

  try {
    const payment = await Payment.find({ customerId }).populate("artisanId")
    if (!payment) {
      return res.status(400).json([]);
    }

    return res.status(200).json(payment)
  } catch (err) {
    console.log("Error in getCustomerPaymentHistory function in payment controller.js", err.message)
    res.status(500).json({ message: err.message });
  }
}

export const getArtisanPaymentHistory = async (req, res) => {
  const artisanId = req.user.id;

  try {
    const payment = await Payment.find({ artisanId }).populate("customerId")
    if (!payment) {
      return res.status(400).json([]);
    }

    return res.status(200).json(payment)
  } catch (err) {
    console.log("Error in getArtisanPaymentHistory function in payment controller.js", err.message)
    res.status(500).json({ message: err.message });
  }
}
export const initiatePayment = async (req, res) => {
  const customerId = req.user.id;
  const { orderId } = req.params

  const tx_ref = 'MC-' + Date.now();

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(400).json({ message: "Order not found" })
  }

  const { email } = await Auth.findOne({ customerId });
  const { firstName, lastName, phoneNumber } = await Customer.findById(customerId);

  const options = {
    method: "POST",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: order.repairFee,
      tx_ref,
      currency: 'NGN',
      redirect_url: `${process.env.CLIENT_URL}/payment-callback`,
      customer: { email: email, name: `${firstName} ${lastName}`, phonenumber: phoneNumber },
      customizations: {
        title: 'FIXR Service Fee',
        logo: ""
      },
    })
  }

  try {
    const response = await fetch(`${FLW_URL}`, options)
    const data = await response.json();

    //could not connect to flutterwave
    if (data.status !== "success") {
      return res.status(400).json({ message: data });
    }

    //connected successfully to flutterwave
    await Payment.create({
      customerId,
      artisanId: order.artisanId,
      orderId: order._id,
      tx_ref,
      amount: order.repairFee,
      payment_link: data.data.link,
      payment_response: data,
    })

    //send back a payment link
    return res.json({
      link: data.data.link
    })

  } catch (err) {
    console.log("Error in initiatePayment function in payment controller", err.message)
    res.status(500).json({ message: err.message })
  }
}

export const verifyCustomerPayment = async (req, res) => {
  const { transaction_id, tx_ref, orderId } = req.body;

  try {

    const payment = await Payment.findOne({ tx_ref });

    if (!payment) {
      return res.status(400).json("Payment not found");
    }

    // verify the transaction on flutterwave
    const response = await fetch(
      ` https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`
        },
      }
    );
    const output = await response.json();

    const verifiedData = output.data;

    if (!verifiedData) {
      return res.status(400).json({ message: "Payment verification failed. Invalid flutterwave response" });
    }

    //ensure the verified data (amt, currency etc) matches preexisting data in Payment collection
    const paymentValid = verifiedData.status === "successful" &&
      verifiedData.amount === payment.amount && verifiedData.currency === payment.currency && verifiedData.tx_ref === payment.tx_ref && verifiedData.id == transaction_id

    payment.status = paymentValid ? "successful" : verifiedData.status;
    payment.payment_response = verifiedData;
    await payment.save();

    const order = await Order.findById(orderId)
    order.paymentStatus = paymentValid && "paid";
    await order.save();

    // Notify admin of successful Flutterwave payment
    if (paymentValid) {
        try {
            const customer = await Customer.findById(payment.customerId);
            const artisan = await Artisan.findById(payment.artisanId);
            const customerName = customer ? `${customer.firstName} ${customer.lastName}` : "Unknown";
            const artisanName = artisan ? `${artisan.firstName} ${artisan.lastName}` : "Unknown";
            await notifyAdminPayment({
                customerName,
                artisanName,
                amount: payment.amount,
                method: "Flutterwave",
                orderId: orderId
            });
        } catch (notifyErr) {
            console.error("Error notifying admin of Flutterwave payment:", notifyErr);
        }
    }

    return res.status(200).json(order)
  } catch (err) {
    console.log("Error in verifyCustomerPayment function in payment controller.js", err.message)
    res.status(500).json(err.message)
  }
}

export const cancelCustomerPayment = async (req, res) => {
  const { tx_ref } = req.params

  try {
    const payment = await Payment.findOne({ tx_ref })
    payment.status = "cancelled"
    await payment.save();

    return res.status(200).json(payment);
  } catch (err) {
    console.log("Error in cancelCustomerPayment function in payment controller.js", err.message);
    return res.status(500).json({ message: err.message });
  }
}
