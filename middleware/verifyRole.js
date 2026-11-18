
import { client } from "../config/db.js";

export const verifyRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const db = client.db(process.env.DB_NAME);

      // MongoDB থেকে user খুঁজে বের করা
      const user = await db.collection("user").findOne({
        id: req.user.sub,
      });

      // User পাওয়া না গেলে
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      // User blocked কি না
      if (user.isBlocked === true) {
        return res.status(403).json({
          success: false,
          message: "Your account is blocked",
        });
      }

      // User-এর role অনুমোদিত কি না
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission",
        });
      }

      // Database-এর বর্তমান role সংরক্ষণ
      req.user.role = user.role;

      next();
    } catch (error) {
      console.error("Role verification failed:", error.message);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};
