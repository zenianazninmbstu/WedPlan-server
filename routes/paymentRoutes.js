import express from "express";
import { createCheckoutSession,
         getAllTransactions,
} from "../controllers/paymentController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyRole } from "../middleware/verifyRole.js";

const router = express.Router();

// Create Premium subscription checkout (Vendor only)
router.post(
  "/create-checkout-session",
  verifyToken,
  verifyRole("vendor"),
  createCheckoutSession
);

router.get(
  "/transactions",
  verifyToken,
  verifyRole("admin"),
  getAllTransactions
);

export default router;