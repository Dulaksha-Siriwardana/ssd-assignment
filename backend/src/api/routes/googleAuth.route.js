import express from "express";
import passport from "../middleware/googleAuth.middleware.js";
import { googleCallback, getUser, logoutUser } from "../controllers/googleAuth.controller.js";

const router = express.Router();

// Start Google OAuth
router.get(
  "/login",
  passport.authenticate("google", { 
    scope: ["profile", "email"],
    prompt: "consent", // Force consent screen
    access_type: "offline" // Request refresh token
  })
);

// Callback
router.get(
  "/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  googleCallback
);

// Get logged-in user
router.get("/user", getUser);

// Logout
router.post("/logout", logoutUser);

export default router;
