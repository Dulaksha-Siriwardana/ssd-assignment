const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const supplierTokenSchema = new Schema(
  {
    tokenHash: {
      type: String, // Store only the hash for security
      required: true,
    },
    itemId: {
      type: String,
    },
    quantity: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "EXPIRED"],
      default: "PENDING",
    },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    expiresAt: {
      type: Date, // Expiry time for the token
      required: true,
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model("SupplierToken", supplierTokenSchema);
