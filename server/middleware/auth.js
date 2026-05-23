const User = require("../models/User");
const { verifyToken } = require("../utils/jwt");

const protect = async (req, res, next) => {
  try {
    // 1. Read the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    // 2. Extract token from "Bearer eyJhbGci..."
    const token = authHeader.split(" ")[1];

    // 3. Verify token (throws if expired or tampered)
    const decoded = verifyToken(token);

    // 4. Find user in DB using the ID stored in token
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    // 5. Attach user to request — route handlers use req.user
    req.user = user;
    next(); // ← Allow the request to continue

  } catch (error) {
    if (error.name === "TokenExpiredError")
      return res.status(401).json({ message: "Token expired, please login again" });
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { protect };