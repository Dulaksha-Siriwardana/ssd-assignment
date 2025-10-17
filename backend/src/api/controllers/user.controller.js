import logger from "../../utils/logger.js";
import User from "../models/user.model.js";
import { validationResult } from "express-validator";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

const userController = {
  async getAllUsers(req, res) {
    try {
      const users = await User.find().select("-password");
      res.json(users);
    } catch (error) {
      logger.error(error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

async getUserById(req, res) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = await User.findById(id).select("-password");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      logger.error(error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  async updateUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Invalid" });
      }

      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const previousPassword = req.body.prevPassword;
      if (!previousPassword) {
        return res.status(400).json({ message: "Previous password required" });
      }

      const isMatch = await bcrypt.compare(previousPassword, user.password);

      if (!isMatch) {
        return res.status(400).json({ message: "Invalid password" });
      }

      // Only update password if newPassword is provided
      if (req.body.newPassword) {
        const salt = await bcrypt.genSalt();
        user.password = await bcrypt.hash(req.body.newPassword, salt);
      }


      user.name = req.body.name || user.name;
      user.firstname = req.body.firstname || user.firstname;
      user.lastname = req.body.lastname || user.lastname;
      user.email = req.body.email || user.email;
      user.role = req.body.role || user.role;
      user.avatar = req.body.avatar || user.avatar;
      user.contact = req.body.contact || user.contact;
      user.address = req.body.address || user.address;
      user.city = req.body.city || user.city;
      user.postalCode = req.body.postalCode || user.postalCode;
      user.country = req.body.country || user.country;

      await user.save();
      res.json({ message: "User updated successfully" });
    } catch (error) {
      logger.error(error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  async deleteUser(req, res) {
    try {
       const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await user.remove();
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      logger.error(error.message);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  async clearNotifications(req, res) {
    try {
      const { email } = req.body;

      // Basic email validation
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ message: "Invalid email" });
      }

      // Find user by email
      const user = await User.findOne({ email: String(email) });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Clear notifications
      user.notifications = [];
      await user.save();

      res.json({ message: "Notifications cleared" });
    } catch (error) {
      logger.error(error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
};

export default userController;
