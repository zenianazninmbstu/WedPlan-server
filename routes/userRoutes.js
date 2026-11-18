import express from "express";
import {
  getAllUsers,
  updateUserStatus,
} from "../controllers/userController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyRole } from "../middleware/verifyRole.js";

const router = express.Router();

// Get all users (Admin only)
router.get("/", verifyToken, verifyRole("admin"), getAllUsers);

router.patch(
  "/:userId/status",
  verifyToken,
  verifyRole("admin"),
  updateUserStatus
);

export default router;