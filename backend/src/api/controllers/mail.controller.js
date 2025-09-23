import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Mailgen from "mailgen";
import crypto from "crypto";
import { addSupplierToken } from "../controllers/supplierToken.controller";
import Supplier from "../models/supplier.model";

dotenv.config();

// FIX 1: SECURE TOKEN GENERATION
const generateSecureToken = async (supplierEmail, itemId) => {
  // Use JWT with strong payload and expiration
  const payload = {
    supplierEmail,
    itemId,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex') // Add randomness
  };
  
  // Create JWT with 24-hour expiration
  const token = jwt.sign(
    payload, 
    process.env.JWT_SECRET ,
    { 
      expiresIn: '24h',
      issuer: 'fashion-retail-store',
      audience: 'supplier-confirmation'
    }
  );
  
  return token;
};

// FIX 2: SECURE EMAIL SENDING WITH RATE LIMITING
export const sendEmail = async (email, itemId, qnt, date) => {
  try {
    // Input validation
    if (!email || !itemId || !qnt || !date) {
      throw new Error('Missing required parameters');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    
    // Check if supplier exists
    const supplier = await Supplier.findOne({ email });
    if (!supplier) {
      throw new Error('Supplier not found');
    }
    
    // Rate limiting check - prevent spam
    const recentTokens = await SupplierToken.countDocuments({
      supplier: supplier._id,
      createdAt: { $gte: new Date(Date.now() - 3600000) } // Last hour
    });
    
    if (recentTokens >= 5) { // Max 5 tokens per hour per supplier
      throw new Error('Rate limit exceeded. Try again later.');
    }
    
    const transporter1 = nodemailer.createTransporter({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASS,
      },
    });
    
    // Generate secure token with supplier context
    const token = await generateSecureToken(email, itemId);
    
    // FIX 3: SECURE CONFIRMATION LINK
    const confirmationLink = `${process.env.FRONTEND_URL}/supplier-order/${encodeURIComponent(token)}`;
    
    const mailGenerator = new Mailgen({
      theme: "default",
      product: {
        name: "Fashion Retail Store",
        link: process.env.FRONTEND_URL,
      },
    });
    
    const emailContent = {
      body: {
        intro: "We would like to inform you that we need to order stock for the following item.",
        table: {
          data: [
            { key: "Item Code", value: itemId },
            { key: "Quantity", value: qnt },
            { key: "Required Date", value: date },
            {
              key: "Confirmation Link",
              value: confirmationLink
            },
          ],
        },
        outro: `
          This link will expire in 24 hours for security purposes.
          Thank you for your prompt attention to this matter.`,
      },
    };
    
    const emailBody = mailGenerator.generate(emailContent);
    
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "New Stock Order - Action Required",
      html: emailBody,
    };
    
    const info = await transporter1.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    
    // Save token with expiration
    const supplierTokenData = {
      token,
      itemId,
      quantity: qnt,
      date,
      supplier: supplier._id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
    
    await addSupplierToken(supplierTokenData);
    
    return {
      status: "success",
      message: "Email sent successfully and token saved",
    };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email: " + error.message);
  }
};