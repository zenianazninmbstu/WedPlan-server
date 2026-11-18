import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyRole } from "../middleware/verifyRole.js";
import {
  getPendingServices,
  updateServiceStatus,
  updateServiceVisibility,
   deleteService,
   getVendorServices,
   createService,
   updateVendorService,
   deleteVendorService,
     getPublicServices,
     getPublicServiceDetails,
} from "../controllers/serviceController.js";



const router = express.Router();

// Get all public services
router.get(
  "/",
  getPublicServices
);

// Get public service details
router.get(
  "/:serviceId",
  getPublicServiceDetails
);

// Update own service (Vendor only)
router.patch(
  "/vendor/:serviceId",
  verifyToken,
  verifyRole("vendor"),
  updateVendorService
);

// Create a new service (Vendor only)
router.post(
  "/",
  verifyToken,
  verifyRole("vendor"),
  createService
);

// Get pending services (Admin only)
router.get(
  "/pending",
  verifyToken,
  verifyRole("admin"),
  getPendingServices
);

// Delete own service (Vendor only)
router.delete(
  "/vendor/:serviceId",
  verifyToken,
  verifyRole("vendor"),
  deleteVendorService
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

// Delete a service (Admin only)
router.delete(
  "/:serviceId",
  verifyToken,
  verifyRole("admin"),
  deleteService
);


  // Get vendor's own services (Vendor only)
router.get(
  "/vendor/my-services",
  verifyToken,
  verifyRole("vendor"),
  getVendorServices
);

export default router;