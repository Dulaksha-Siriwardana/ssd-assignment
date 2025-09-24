import { Router } from "express";
import userController from "../controllers/user.controller";
import authMiddleware from "../middleware/authMiddleware";
import {
  validateUserUpdate,
  validatePasswordChange,
  handleValidationErrors,
  validateSecureRequest
} from "../middleware/validation.middleware.js";
import { body } from "express-validator";

const userRouter = Router();

// Get all users (admin only)
userRouter.get("/", authMiddleware(["admin"]), userController.getAllUsers);

// Get user profile (authenticated user)
userRouter.get("/profile", authMiddleware(["admin", "user", "staff", "supplier"]), userController.getUserProfile);

// Get user by ID
userRouter.get(
  "/:id",
  authMiddleware(["admin", "user"]),
  userController.getUserById
);

// Update user profile
userRouter.put(
  "/:id",
  authMiddleware(["admin", "user"]),
  validateSecureRequest,
  validateUserUpdate,
  handleValidationErrors,
  userController.updateUser
);

// Change password
userRouter.patch(
  "/:id/password",
  authMiddleware(["admin", "user"]),
  validatePasswordChange,
  handleValidationErrors,
  userController.changePassword
);

// Delete user
userRouter.delete(
  "/:id",
  authMiddleware(["admin"]), // Only admin can delete users
  userController.deleteUser
);

// Clear notifications
userRouter.post(
  "/clear-notifications",
  authMiddleware(["admin", "user", "staff", "supplier"]),
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],
  handleValidationErrors,
  userController.clearNotifications
);

export default userRouter;
