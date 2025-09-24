import { body, validationResult } from 'express-validator';
import validator from 'validator';

/**
 * Validation middleware for user registration
 */
export const validateUserRegistration = [
  // Username validation
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .custom(async (value) => {
      // Additional sanitization
      if (validator.contains(value, ' ')) {
        throw new Error('Username cannot contain spaces');
      }
      return true;
    }),

  // First name validation
  body('firstname')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2-50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces')
    .custom((value) => {
      // Check for excessive spaces
      if (value.includes('  ')) {
        throw new Error('First name cannot contain multiple consecutive spaces');
      }
      return true;
    }),

  // Last name validation
  body('lastname')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2-50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces')
    .custom((value) => {
      // Check for excessive spaces
      if (value.includes('  ')) {
        throw new Error('Last name cannot contain multiple consecutive spaces');
      }
      return true;
    }),

  // Email validation
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 254 })
    .withMessage('Email is too long')
    .custom((value) => {
      // Additional email validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(value)) {
        throw new Error('Invalid email format');
      }
      return true;
    }),

  // Password validation
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)')
    .custom((value) => {
      // Check for common weak passwords
      const commonPasswords = ['password', '12345678', 'qwerty', 'abc123'];
      if (commonPasswords.some(pwd => value.toLowerCase().includes(pwd))) {
        throw new Error('Password is too common. Please choose a stronger password');
      }
      return true;
    }),

  // Role validation (optional)
  body('role')
    .optional()
    .isIn(['user', 'admin', 'staff', 'supplier'])
    .withMessage('Role must be either user, admin, staff, or supplier'),

  // Contact validation (optional)
  body('contact')
    .optional()
    .custom((value) => {
      if (!value) return true; // Allow empty contact
      
      // Remove any formatting characters for validation
      const cleanContact = value.replace(/[\s\-\(\)]/g, '');
      
      // Sri Lankan phone number validation
      const sriLankanMobileRegex = /^(\+94|94|0)?(7[0-8]\d{7})$/;
      const sriLankanLandlineRegex = /^(\+94|94|0)?(0?(?:11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|47|51|52|54|55|57|63|65|66|67|81|91)\d{7})$/;
      
      if (!sriLankanMobileRegex.test(cleanContact) && !sriLankanLandlineRegex.test(cleanContact)) {
        throw new Error('Please provide a valid Sri Lankan phone number (e.g., +94771234567, 0771234567, or 0112345678)');
      }
      return true;
    }),

  // Optional field validations
  body('address')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address cannot exceed 255 characters'),

  body('city')
    .optional()
    .trim()
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('City can only contain letters and spaces')
    .isLength({ max: 50 })
    .withMessage('City name cannot exceed 50 characters'),

  body('postalCode')
    .optional()
    .trim()
    .matches(/^\d{5}$/)
    .withMessage('Postal code must be 5 digits'),

  body('country')
    .optional()
    .trim()
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Country can only contain letters and spaces')
    .isLength({ max: 50 })
    .withMessage('Country name cannot exceed 50 characters'),
];

/**
 * Validation middleware for user login
 */
export const validateUserLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required')
    .isLength({ max: 254 })
    .withMessage('Username/email is too long'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password is too long'),
];

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

/**
 * Validation middleware for user profile updates
 */
export const validateUserUpdate = [
  // First name validation
  body('firstname')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2-50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),

  // Last name validation
  body('lastname')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2-50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),

  // Email validation (for profile updates)
  body('email')
    .optional()
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Please provide a valid email address'),

  // Contact validation (optional)
  body('contact')
    .optional()
    .custom((value) => {
      if (!value) return true;
      
      const cleanContact = value.replace(/[\s\-\(\)]/g, '');
      const sriLankanMobileRegex = /^(\+94|94|0)?(7[0-8]\d{7})$/;
      const sriLankanLandlineRegex = /^(\+94|94|0)?(0?(?:11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|47|51|52|54|55|57|63|65|66|67|81|91)\d{7})$/;
      
      if (!sriLankanMobileRegex.test(cleanContact) && !sriLankanLandlineRegex.test(cleanContact)) {
        throw new Error('Please provide a valid Sri Lankan phone number');
      }
      return true;
    }),

  // Optional field validations
  body('address')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address cannot exceed 255 characters'),

  body('city')
    .optional()
    .trim()
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('City can only contain letters and spaces')
    .isLength({ max: 50 })
    .withMessage('City name cannot exceed 50 characters'),

  body('postalCode')
    .optional()
    .trim()
    .matches(/^\d{5}$/)
    .withMessage('Postal code must be 5 digits'),

  body('country')
    .optional()
    .trim()
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Country can only contain letters and spaces')
    .isLength({ max: 50 })
    .withMessage('Country name cannot exceed 50 characters'),
];

/**
 * Validation middleware for password change
 */
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
];

/**
 * Additional security validation middleware
 */
export const validateSecureRequest = (req, res, next) => {
  try {
    // Check for SQL injection patterns
    const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)|(['";\-\-])/i;
    
    const checkFields = ['username', 'email', 'firstname', 'lastname'];
    
    for (const field of checkFields) {
      if (req.body[field] && sqlInjectionPattern.test(req.body[field])) {
        return res.status(400).json({
          success: false,
          message: 'Invalid characters detected in input'
        });
      }
    }
    
    // Check for XSS patterns
    const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    
    for (const field of checkFields) {
      if (req.body[field] && xssPattern.test(req.body[field])) {
        return res.status(400).json({
          success: false,
          message: 'Invalid content detected in input'
        });
      }
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Security validation failed'
    });
  }
};