import { Router } from "express";
import authController from "../controllers/auth.controller";
import authMiddleware from "../middleware/authMiddleware";
import { loginLimiter, registerLimiter, authLimiter } from "../middleware/rateLimiter";

const authRouter = Router();

authRouter.post("/register", registerLimiter, authController.register);
authRouter.post("/login", loginLimiter, authController.login);
authRouter.post(
  "/check-auth",
  authLimiter,
  authMiddleware(["admin", "user"]),
  authController.checkAuth
);

export default authRouter;
