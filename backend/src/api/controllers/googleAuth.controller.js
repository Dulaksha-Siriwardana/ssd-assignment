export const googleCallback = (req, res) => {
  // Successful login → send user data back
  res.redirect("http://localhost:5173/dashboard"); // frontend redirect
};

export const getUser = (req, res) => {
  if (req.user) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
};

export const logoutUser = (req, res) => {
  console.log("Logout request received");
  console.log("User authenticated:", req.isAuthenticated());
  console.log("Session ID:", req.sessionID);
  
  // First logout from Passport
  req.logout((err) => {
    if (err) {
      console.error("Passport logout error:", err);
      return res.status(500).json({ error: "Passport logout failed" });
    }
    
    console.log("Passport logout successful");
    
    // Then destroy the session
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error("Session destruction error:", sessionErr);
        return res.status(500).json({ error: "Session destruction failed" });
      }
      
      console.log("Session destroyed successfully");
      
      // Clear the session cookie
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });
      
      console.log("Cookie cleared");
      
      res.json({ 
        message: "Logged out successfully",
        success: true 
      });
    });
  });
};
