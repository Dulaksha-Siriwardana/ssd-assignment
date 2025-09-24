import logger from "../../utils/logger.js";
import User from "../models/user.model.js";
import { validationResult } from "express-validator";
import validator from 'validator';
import bcrypt from "bcrypt";

const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    throw new Error('Invalid input type');
  }
  return validator.escape(input.trim());
};

const userController = {
  async getAllUsers(req, res) {
    try {
      const users = await User.find()
        .select("-password -loginAttempts -lockUntil")
        .sort({ created_date: -1 });
      
      res.status(200).json({
        success: true,
        count: users.length,
        users: users
      });
    } catch (error) {
      logger.error(`Get all users error: ${error.message}`);
      res.status(500).json({ 
        success: false,
        message: "Failed to retrieve users" 
      });
    }
  },

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      // Validate MongoDB ObjectId
      if (!validator.isMongoId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format"
        });
      }

      const user = await User.findById(id)
        .select("-password -loginAttempts -lockUntil");
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.status(200).json({
        success: true,
        user: user
      });
    } catch (error) {
      logger.error(`Get user by ID error: ${error.message}`);
      res.status(500).json({ 
        success: false,
        message: "Failed to retrieve user" 
      });
    }
  },

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      
      // Validate MongoDB ObjectId
      if (!validator.isMongoId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format"
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      // Extract updateable fields
      const {
        firstname,
        lastname,
        email,
        contact,
        address,
        city,
        postalCode,
        country,
        avatar
      } = req.body;

      const updateData = {};

      // Only update fields that are provided
      if (firstname) updateData.firstname = sanitizeInput(firstname);
      if (lastname) updateData.lastname = sanitizeInput(lastname);
      if (email && email !== user.email) {
        // Check if new email already exists
        const emailExists = await User.findOne({ 
          email: email.toLowerCase(),
          _id: { $ne: id }
        });
        
        if (emailExists) {
          return res.status(409).json({
            success: false,
            message: "Email already exists",
            field: "email"
          });
        }
        
        updateData.email = email.toLowerCase();
      }
      if (contact) updateData.contact = sanitizeInput(contact);
      if (address) updateData.address = sanitizeInput(address);
      if (city) updateData.city = sanitizeInput(city);
      if (postalCode) updateData.postalCode = sanitizeInput(postalCode);
      if (country) updateData.country = sanitizeInput(country);
      if (avatar) updateData.avatar = avatar;

      const updatedUser = await User.findByIdAndUpdate(
        id, 
        updateData, 
        { 
          new: true, 
          runValidators: true,
          context: 'query'
        }
      ).select("-password -loginAttempts -lockUntil");

      logger.info(`User updated: ${updatedUser.email}`);

      res.status(200).json({ 
        success: true,
        message: "User updated successfully",
        user: updatedUser
      });

    } catch (error) {
      // Handle mongoose validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors
        });
      }

      logger.error(`Update user error: ${error.message}`);
      res.status(500).json({ 
        success: false,
        message: "Failed to update user" 
      });
    }
  },

  async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      // Validate MongoDB ObjectId
      if (!validator.isMongoId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format"
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ 
          success: false,
          message: "Current password is incorrect",
          field: "currentPassword"
        });
      }

      // Check if new password is different from current
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: "New password must be different from current password",
          field: "newPassword"
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      user.password = hashedPassword;
      await user.save();

      logger.info(`Password changed for user: ${user.email}`);

      res.status(200).json({ 
        success: true,
        message: "Password changed successfully" 
      });

    } catch (error) {
      logger.error(`Change password error: ${error.message}`);
      res.status(500).json({ 
        success: false,
        message: "Failed to change password" 
      });
    }
  },

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      // Validate MongoDB ObjectId
      if (!validator.isMongoId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format"
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      // Prevent deletion of admin users (additional security)
      if (user.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: "Cannot delete admin users"
        });
      }

      await User.findByIdAndDelete(id);

      logger.info(`User deleted: ${user.email}`);

      res.status(200).json({ 
        success: true,
        message: "User deleted successfully" 
      });
    } catch (error) {
      logger.error(`Delete user error: ${error.message}`);
      res.status(500).json({ 
        success: false,
        message: "Failed to delete user" 
      });
    }
  },

  async clearNotifications(req, res) {
    try {
      const { email } = req.body;

      // Validate email format
      if (!email || !validator.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "Valid email is required"
        });
      }

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      // Clear notifications
      user.notifications = [];
      await user.save();

      logger.info(`Notifications cleared for user: ${email}`);

      res.status(200).json({ 
        success: true,
        message: "Notifications cleared successfully" 
      });
    } catch (error) {
      logger.error(`Clear notifications error: ${error.message}`);
      res.status(500).json({ 
        success: false,
        message: "Failed to clear notifications" 
      });
    }
  },

  async getUserProfile(req, res) {
    try {
      const userId = req.user._id;

      const user = await User.findById(userId)
        .select("-password -loginAttempts -lockUntil");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User profile not found"
        });
      }

      res.status(200).json({
        success: true,
        user: user
      });
    } catch (error) {
      logger.error(`Get user profile error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve user profile"
      });
    }
  },
};

export default userController;
