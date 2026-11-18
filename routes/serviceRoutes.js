import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyRole } from "../middleware/verifyRole.js";
import {
  getPendingServices,
  updateServiceStatus,
  updateServiceVisibility,
} from "../controllers/serviceController.js";



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

// Publish or unpublish a service (Admin only)
router.patch(
  "/:serviceId/visibility",
  verifyToken,
  verifyRole("admin"),
  updateServiceVisibility
);

export default router;