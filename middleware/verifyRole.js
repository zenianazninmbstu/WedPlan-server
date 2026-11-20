
import { client } from "../config/db.js";
import { ObjectId } from "mongodb";

export const verifyRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const db = client.db(process.env.DB_NAME);

      if (!ObjectId.isValid(req.user.sub)) {
        return res.status(401).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      const user = await db.collection("user").findOne({
        _id: new ObjectId(req.user.sub),
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.isBlocked === true) {
        return res.status(403).json({
          success: false,
          message: "Your account is blocked",
        });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission",
        });
      }

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
