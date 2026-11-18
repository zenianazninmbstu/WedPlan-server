import express from "express";
import { createBooking,
          getCustomerBookings,
           cancelBooking,
            getVendorBookings,
             updateBookingStatus,
 } from "../controllers/bookingController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyRole } from "../middleware/verifyRole.js";

const router = express.Router();

// Create a booking (Customer only)
router.post(
  "/",
  verifyToken,
  verifyRole("customer"),
  createBooking
);

// Get vendor's own booking requests
router.get(
  "/vendor/requests",
  verifyToken,
  verifyRole("vendor"),
  getVendorBookings
);

// Accept or reject a booking (Vendor only)
router.patch(
  "/:bookingId/status",
  verifyToken,
  verifyRole("vendor"),
  updateBookingStatus
);

// Get customer's own bookings
router.get(
  "/my-bookings",
  verifyToken,
  verifyRole("customer"),
  getCustomerBookings
);

// Cancel own pending booking
router.patch(
  "/:bookingId/cancel",
  verifyToken,
  verifyRole("customer"),
  cancelBooking
);

export default router;