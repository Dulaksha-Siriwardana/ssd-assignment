import mongoose from "mongoose";

const ReferralSchema = new mongoose.Schema({
  referrerEmail: { type: String, required: true },
  referredEmail: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
});

const Referral = mongoose.model("Referral", ReferralSchema);

export default Referral;
