import { Router } from "express";
import authController from "../controllers/auth.controller";
import authMiddleware from "../middleware/authMiddleware";
import { loginLimiter, registerLimiter, authLimiter } from "../middleware/rateLimiter";
import { 
  validateUserRegistration, 
  validateUserLogin, 
  handleValidationErrors,
  validateSecureRequest 
} from "../middleware/validation.middleware.js";

const authRouter = Router();

authRouter.post(
  "/register", 
  registerLimiter,
  validateSecureRequest,
  validateUserRegistration,
  handleValidationErrors,
  authController.register
);

authRouter.post(
  "/login", 
  loginLimiter,
  validateSecureRequest,
  validateUserLogin,
  handleValidationErrors,
  authController.login
);

authRouter.post(
  "/check-auth",
  authLimiter,
  authMiddleware(["admin", "user"]),
  authController.checkAuth
);

export default authRouter;
