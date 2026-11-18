import express from "express";
import {
  getPendingServices,
  updateServiceStatus,
} from "../controllers/serviceController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyRole } from "../middleware/verifyRole.js";

const router = express.Router();

// Get pending services (Admin only)
router.get(
  "/pending",
  verifyToken,
  verifyRole("admin"),
  getPendingServices
);

// Approve or reject a service (Admin only)
router.patch(
  "/:serviceId/status",
  verifyToken,
  verifyRole("admin"),
  updateServiceStatus
);

export default router;