import express from "express";
import { sendEmail } from "../controllers/mail.controller.js";

const router = express.Router();

router.post("/send-email", async (req, res) => {
  const { email, itemCode, qnt, date } = req.body;

  try {
    // ensure sendEmail uses sanitized values when composing HTML
    const message = await sendEmail(email, itemCode, qnt, date);
    res.status(200).json({ success: true, message });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, error: "Internal server error" }); 
  }
});

export default router;
