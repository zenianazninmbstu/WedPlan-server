import express from "express";
import { createBooking } from "../controllers/bookingController.js";
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

export default router;