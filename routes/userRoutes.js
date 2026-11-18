import express from "express";
import {
  getAllUsers,
  updateUserStatus,
  getMyProfile,
  updateMyProfile,
} from "../controllers/userController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyRole } from "../middleware/verifyRole.js";



const router = express.Router();

// Get all users (Admin only)
router.get("/", verifyToken, verifyRole("admin"), getAllUsers);

// Get logged-in user's profile
router.get(
  "/me",
  verifyToken,
  getMyProfile
);

// Update logged-in user's profile
router.patch(
  "/me",
  verifyToken,
  updateMyProfile
);

router.patch(
  "/:userId/status",
  verifyToken,
  verifyRole("admin"),
  updateUserStatus
);

export default router;