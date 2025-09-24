import User from "../models/user.model.js";
import { validationResult } from "express-validator";
import logger from "../../utils/logger.js";
import bcrypt from "bcrypt";
import validator from 'validator';
import genAuthToken from "../../utils/genAuthToken.js";
import { emailOrUsername } from "../../utils/helpers.js";
import Referral from "../models/referral.js";
import Loyalty from "../models/loyalty.js";
import { determineTier } from "../controllers/loyaltyController.js";

/**
 * @typedef {import('../../types/user.js').ExtendedUserDocument} ExtendedUserDocument
 */

const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    throw new Error('Invalid input type');
  }
  return validator.escape(input.trim());
};

const authController = {
  
  async register(req, res) {
    try {
      const {
        username,
        firstname,
        lastname,
        email,
        password,
        role,
        avatar,
        contact,
        address,
        city,
        postalCode,
        country,
        referralCode,
      } = req.body;

      // Sanitize inputs (additional layer of security)      const sanitizedUsername = sanitizeInput(username);
      const sanitizedEmail = sanitizeInput(email.toLowerCase());
      const sanitizedFirstname = sanitizeInput(firstname);
      const sanitizedLastname = sanitizeInput(lastname);


      const [userNameExists, userEmailExists] = await Promise.all([
        User.findOne({ 
          username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') }
        }),
        User.findOne({ 
          email: { $regex: new RegExp(`^${sanitizedEmail}$`, 'i') }
        })
      ]);

      if (userNameExists) {
        return res.status(409).json({ 
          message: "Username already exists", 
          success: false,
          field: "username"
        });
      }

      if (userEmailExists) {
        return res.status(409).json({ 
          message: "Email already exists", 
          success: false,
          field: "email"
        });
      }

      // Validate referral code if provided
      if (referralCode) {
        const referralExists = await Referral.findOne({ token: referralCode });
        if (!referralExists) {
          return res.status(400).json({
            message: "Invalid referral code",
            success: false,
            field: "referralCode"
          });
        }
      }

      // Hash the password with stronger salt rounds
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create new user
      const userData = {
        username: sanitizedUsername,
        firstname: sanitizedFirstname,
        lastname: sanitizedLastname,
        email: sanitizedEmail,
        password: hashedPassword,
        role: role || "user",
        created_date: new Date(),
        last_login: new Date(),
        referralCode: referralCode || null,
      };

      // Add optional fields only if they exist
      if (avatar) userData.avatar = avatar;
      if (contact) userData.contact = sanitizeInput(contact);
      if (address) userData.address = sanitizeInput(address);
      if (city) userData.city = sanitizeInput(city);
      if (postalCode) userData.postalCode = sanitizeInput(postalCode);
      if (country) userData.country = sanitizeInput(country);

      const user = new User(userData);

      try {
        const savedUser = await user.save();
        
        // Remove sensitive data before sending response
        const userResponse = savedUser.toObject();
        delete userResponse.password;
        delete userResponse.loginAttempts;
        delete userResponse.lockUntil;

        const token = genAuthToken(savedUser);

        // Process referral code if present
        if (referralCode) {
          await processReferral(referralCode, savedUser.email);
        }

        logger.info(`New user registered: ${sanitizedEmail}`);

        res.status(201).json({ 
          user: userResponse, 
          token: token, 
          success: true,
          message: "User registered successfully"
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

        // Handle duplicate key errors
        if (error.code === 11000) {
          const field = Object.keys(error.keyPattern)[0];
          return res.status(409).json({
            success: false,
            message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
            field: field
          });
        }

        logger.error(`Registration error: ${error.message}`);
        res.status(500).json({ 
          success: false, 
          message: "Registration failed. Please try again." 
        });
      }
    } catch (error) {
      logger.error(`Registration error: ${error.message}`);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  },

  async login(req, res) {
    const { username, password } = req.body;

    try {
      // Validation is already handled by middleware
      const sanitizedUsername = sanitizeInput(username.toLowerCase());
      
      // Determine if input is email or username
      const type = emailOrUsername(sanitizedUsername);
      
      /** @type {ExtendedUserDocument | null} */
      let user;
      
      if (type === "email") {
        user = await User.findOne({ 
          email: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') }
        });
      } else {
        user = await User.findOne({ 
          username: { $regex: new RegExp(`^${sanitizedUsername}$`, 'i') }
        });
      }
      
      // Check if user exists
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid credentials",
          field: type === "email" ? "email" : "username"
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60)); // minutes
        return res.status(423).json({ 
          success: false, 
          message: `Account temporarily locked. Try again in ${lockTimeRemaining} minutes.`,
          lockTimeRemaining: lockTimeRemaining
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        // Increment login attempts
        await user.incLoginAttempts();
        
        // Get updated user data to check if account got locked
        const updatedUser = await User.findById(user._id);
        
        if (updatedUser.isLocked) {
          return res.status(423).json({ 
            success: false, 
            message: "Too many failed login attempts. Account has been temporarily locked.",
            accountLocked: true
          });
        }
        
        const remainingAttempts = 5 - (updatedUser.loginAttempts || 0);
        return res.status(401).json({ 
          success: false, 
          message: "Invalid credentials",
          remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0
        });
      }

      // Reset login attempts on successful login
      if (user.loginAttempts && user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Update last login
      user.last_login = new Date();
      await user.save();

      // Remove sensitive data before sending response
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.loginAttempts;
      delete userResponse.lockUntil;

      const token = genAuthToken(user);
      
      logger.info(`User logged in: ${user.email}`);
      
      res.status(200).json({
        success: true,
        message: "Login successful",
        user: userResponse,
        token: token,
      });
      
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      res.status(500).json({ 
        success: false, 
        message: "Login failed. Please try again." 
      });
    }
  },
  async checkAuth(req, res) {
    try {
      const user = await User.findById(req.user._id).select("-password");

      const { authorization } = req.headers;

      if (!authorization) {
        return res.status(401).json({ sucess: false, message: "Unauthorized" });
      }

      const token = authorization.split(" ")[1];

      res.status(200).json({ success: true, user: user, token: token });
    } catch (error) {
      logger.error(error.message);
      res.status(500).json({ sucess: false, message: "Internal server error" });
    }
  },

  async logout(req, res) {
    try {
      res.clearCookie("token");

      res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      logger.error("Logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};

// Function to process referral
const processReferral = async (referralToken, referredEmail) => {
  try {
    // Find the referral using the token
    const referral = await Referral.findOne({ token: referralToken });
    if (referral) {
      const referrerEmail = referral.referrerEmail;

      // Find the referrer
      const referrer = await User.findOne({ email: referrerEmail });
      if (referrer) {
        // Find the loyalty record for the referrer
        const loyalty = await Loyalty.findOne({ email: referrerEmail });

        if (loyalty) {
          // Add 40 points to the referrer's loyalty points
          loyalty.loyaltyPoints += 40;

          // Increment the referred count by 1
          loyalty.referredcount += 1;

          // Determine new tier based on updated loyalty points
          const newTier = determineTier(loyalty.loyaltyPoints);
          // Update the tier if it has changed
          if (loyalty.tier !== newTier) {
            loyalty.tier = newTier;
            // Add a notification for tier change
            referrer.notifications.push(
              `Congratulations! You have been promoted to ${newTier} tier!`
            );
          }

          await loyalty.save();

          // Add a notification to the referrer
          referrer.notifications.push(
            "Congratulations, Your referral has successfully Signed Up. As a reward, 40 points have been added to your Loyalty account."
          );
          await referrer.save();
        } else {
          console.log(`Loyalty record not found for ${referrerEmail}`);
        }
      } else {
        console.log(`Referrer not found with email ${referrerEmail}`);
      }

      // Delete referral entry
      await Referral.deleteOne({ token: referralToken });
    } else {
      console.log(`Referral token ${referralToken} not found`);
    }
  } catch (error) {
    console.error("Error processing referral:", error);
  }
};

export default authController;
