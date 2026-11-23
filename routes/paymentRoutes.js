import express from "express";
import { createCheckoutSession,
         getAllTransactions,
           getMySubscription,
} from "../controllers/paymentController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyRole } from "../middleware/verifyRole.js";
import { getAdminStats } from "../controllers/adminController.js";

const router = express.Router();

// Create Premium subscription checkout (Vendor only)
router.post(
  "/create-checkout-session",
  verifyToken,
  verifyRole("vendor"),
  createCheckoutSession
);

router.get(
  "/my-subscription",
  verifyToken,
  verifyRole("vendor"),
  getMySubscription
);


router.get(
  "/transactions",
  verifyToken,
  verifyRole("admin"),
  getAllTransactions
);

router.get(
  "/admin-stats",
  verifyToken,
  verifyRole("admin"),
  getAdminStats
);



router.get(
  "/transactions",
  verifyToken,
  verifyRole("admin"),
  getAllTransactions
);

export default router;