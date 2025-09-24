import User from "../models/user.model.js";
import { validationResult } from "express-validator";
import logger from "../../utils/logger.js";
import bcrypt from "bcrypt";
import validator from 'validator';
import genAuthToken from "../../utils/genAuthToken.js";
import { emailOrUsername } from "../../utils/helpers.js";
import Referral from "../models/referral";
import Loyalty from "../models/loyalty";
import { determineTier } from "../controllers/loyaltyController.js";

const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    throw new Error('Invalid input type');
  }
  return validator.escape(input.trim());
};

const authController = {
  
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

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

      const sanitizedUsername = sanitizeInput(username);
      const sanitizedEmail = sanitizeInput(email);

      if (!validator.isEmail(sanitizedEmail)) {
        return res.status(400).json({ 
          message: "Invalid email format", 
          success: false 
        });
      }

      if (!validator.isLength(sanitizedUsername, { min: 3, max: 20 })) {
        return res.status(400).json({ 
          message: "Username must be between 3-20 characters", 
          success: false 
        });
      }

      const userNameExists = await User.findOne({ 
        username: { $eq: sanitizedUsername } 
      });
      if (userNameExists) {
        return res
          .status(400)
          .json({ message: "Username already exists", success: false });
      }

      const userExists = await User.findOne({ 
        email: { $eq: sanitizedEmail } 
      });
      if (userExists) {
        return res
          .status(400)
          .json({ message: "User already exists", success: false });
      }

      // Hash the password
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = new User({
        username: sanitizedUsername,
        firstname: sanitizeInput(firstname),
        lastname: sanitizeInput(lastname),
        email: sanitizedEmail,
        password: hashedPassword,
        role: role || "user",
        avatar,
        contact: contact ? sanitizeInput(contact) : undefined,
        address: address ? sanitizeInput(address) : undefined,
        city: city ? sanitizeInput(city) : undefined,
        postalCode: postalCode ? sanitizeInput(postalCode) : undefined,
        country: country ? sanitizeInput(country) : undefined,
        created_date: new Date(),
        last_login: new Date(),
        referralCode: referralCode || null,
      });

      try {
        const savedUser = await user.save();
        savedUser.password = undefined;
        const token = genAuthToken(savedUser);

        // Process referral code if present
        if (referralCode) {
          await processReferral(referralCode, savedUser.email);
        }

        res.status(201).json({ user: savedUser, token: token, success: true });
      } catch (error) {
        logger.error(error.message);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    } catch (error) {
      logger.error(error.message);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },

  async login(req, res) {
  const { username, password } = req.body;

  try {
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedPassword = sanitizeInput(password);
    
    if (!sanitizedUsername || !sanitizedPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    const type = emailOrUsername(sanitizedUsername);
    
    let user;
    if (type === "email") {
      user = await User.findOne({ 
        email: { $eq: sanitizedUsername } 
      });
    } else {
      user = await User.findOne({ 
        username: { $eq: sanitizedUsername } 
      });
    }

    const validPassword = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !validPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    user.password = undefined;
    const token = genAuthToken(user);
    
    res.status(200).json({
      success: true,
      message: "Successfully logged in",
      user: user,
      token: token,
    });
  } catch (error) {
    logger.error(error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
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
