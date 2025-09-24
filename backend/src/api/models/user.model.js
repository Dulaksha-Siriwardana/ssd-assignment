import mongoose from "mongoose";

/**
 * @typedef {Object} IUserMethods
 * @property {function(): Promise} incLoginAttempts - Increment login attempts and potentially lock account
 * @property {function(): Promise} resetLoginAttempts - Reset login attempts after successful login
 */

/**
 * @typedef {Object} IUserVirtuals
 * @property {boolean} isLocked - Whether the account is currently locked
 */

/**
 * @typedef {mongoose.Document & IUserMethods & IUserVirtuals} UserDocument
 */

// define an user schema for a typical ecommerce customer and backend staff user
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores'
    ],
  },
  firstname: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters long'],
    maxlength: [50, 'First name cannot exceed 50 characters'],
    match: [
      /^[a-zA-Z\s]+$/,
      'First name can only contain letters and spaces'
    ],
  },
  lastname: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters long'],
    maxlength: [50, 'Last name cannot exceed 50 characters'],
    match: [
      /^[a-zA-Z\s]+$/,
      'Last name can only contain letters and spaces'
    ],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Please provide a valid email address'
    ],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    validate: {
      validator: function(password) {
        // Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password);
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
    }
  },
  role: {
    type: String,
    required: true,
    default: "user",
    enum: {
      values: ['user', 'admin', 'staff', 'supplier'],
      message: 'Role must be either user, admin, staff, or supplier'
    }
  },
  avatar: {
    type: String,
  },
  contact: {
    type: String,
    validate: {
      validator: function(contact) {
        // Allow empty contact (optional field)
        if (!contact) return true;
        
        // Sri Lankan phone number validation
        // Supports formats: +94XXXXXXXXX, 94XXXXXXXXX, 0XXXXXXXXX, XXXXXXXXX
        // Mobile numbers: 70, 71, 72, 74, 75, 76, 77, 78
        // Landline numbers: Area codes like 011, 021, 023, 024, 025, 026, 027, 031, 032, 033, 034, 035, 036, 037, 038, 041, 045, 047, 051, 052, 054, 055, 057, 063, 065, 066, 067, 081, 091
        const sriLankanMobileRegex = /^(\+94|94|0)?(7[0-8]\d{7})$/;
        const sriLankanLandlineRegex = /^(\+94|94|0)?(0?(?:11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|47|51|52|54|55|57|63|65|66|67|81|91)\d{7})$/;
        
        return sriLankanMobileRegex.test(contact) || sriLankanLandlineRegex.test(contact);
      },
      message: 'Please provide a valid Sri Lankan phone number (e.g., +94771234567, 0771234567, or 0112345678)'
    }
  },
  address: {
    type: String,
  },
  city: {
    type: String,
  },
  postalCode: {
    type: String,
  },
  country: {
    type: String,
  },
  referralCode: {
    type: String,
    default: null,
  },
  notifications: { type: [String], default: [] },
  created_date: {
    type: Date,
    required: true,
  },

  last_login: {
    type: Date,
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
});

// Pre-save hook to format contact number
userSchema.pre('save', function(next) {
  // Format Sri Lankan contact number to a consistent format
  if (this.contact) {
    // Remove any spaces, hyphens, or brackets
    let formattedContact = this.contact.replace(/[\s\-\(\)]/g, '');
    
    // Convert to standard format with +94
    if (formattedContact.startsWith('0')) {
      formattedContact = '+94' + formattedContact.substring(1);
    } else if (formattedContact.startsWith('94') && !formattedContact.startsWith('+94')) {
      formattedContact = '+' + formattedContact;
    } else if (!formattedContact.startsWith('+94')) {
      formattedContact = '+94' + formattedContact;
    }
    
    this.contact = formattedContact;
  }
  
  next();
});

// Add indexes for better performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

/**
 * Virtual property to check if the account is currently locked
 * @returns {boolean} True if account is locked, false otherwise
 */
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

/**
 * Method to increment login attempts and potentially lock the account
 * @returns {Promise} Update promise
 */
userSchema.methods.incLoginAttempts = function() {
  const maxAttempts = 5;
  const lockTime = 30 * 60 * 1000; // 30 minutes

  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: {
        loginAttempts: 1
      },
      $unset: {
        lockUntil: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If we've hit max attempts, lock the account
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + lockTime
    };
  }
  
  return this.updateOne(updates);
};

/**
 * Method to reset login attempts after successful login
 * @returns {Promise} Update promise
 */
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

/**
 * @type {mongoose.Model<UserDocument>}
 */
const User = mongoose.model("User", userSchema);

export default User;
