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
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ message: "Logged out" });
  });
};
