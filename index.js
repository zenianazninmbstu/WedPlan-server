
import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { connectDB } from "./config/db.js";
import { auth } from "./config/auth.js";
import { verifyToken } from "./middleware/verifyToken.js";

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Better Auth route (must be before express.json)
app.all("/api/auth/*splat", toNodeHandler(auth));

// Body parser
app.use(express.json());

// Protected test route
app.get("/api/protected", verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "You are authenticated!",
    user: req.user,
  });
});

// Default route
app.get("/", (req, res) => {
  res.send("WedPlan Server is running!");
});

// Start server after database connection
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`WedPlan server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
