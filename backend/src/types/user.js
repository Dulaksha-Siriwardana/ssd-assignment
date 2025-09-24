/**
 * @fileoverview Type definitions for User model with custom methods
 */

/**
 * @typedef {Object} UserMethods
 * @property {function(): Promise<any>} incLoginAttempts - Increment login attempts and potentially lock account
 * @property {function(): Promise<any>} resetLoginAttempts - Reset login attempts after successful login
 */

/**
 * @typedef {Object} UserVirtuals  
 * @property {boolean} isLocked - Whether the account is currently locked
 */

/**
 * Extended User document type with custom methods and virtuals
 * @typedef {import('mongoose').Document & UserMethods & UserVirtuals} ExtendedUserDocument
 */

export {};