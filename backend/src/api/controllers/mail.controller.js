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
    
    
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email: " + error.message);
  }
};