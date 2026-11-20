
import { createRemoteJWKSet, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import { client } from "../config/db.js";

const authBaseURL = process.env.BETTER_AUTH_URL;

if (!authBaseURL) {
  throw new Error("BETTER_AUTH_URL is missing from environment variables");
}

const JWKS = createRemoteJWKSet(
  new URL(`${authBaseURL}/api/auth/jwks`)
);

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Token is required",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid token",
    });
  }

  let payload;

  // Step 1: Verify JWT
  try {
    const result = await jwtVerify(token, JWKS, {
      issuer: authBaseURL,
      audience: authBaseURL,
    });

    payload = result.payload;

    if (
      typeof payload.sub !== "string" ||
      !ObjectId.isValid(payload.sub)
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid user token",
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
    });
  }

  // Step 2: Check user status in MongoDB
  try {
    const db = client.db(process.env.DB_NAME);

    const user = await db.collection("user").findOne(
      { _id: new ObjectId(payload.sub) },
      { projection: { isBlocked: 1 } }
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found",
      });
    }

    if (user.isBlocked === true) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked",
      });
    }

    req.user = payload;
    next();
  } catch (error) {
    console.error("User status check failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify user status",
    });
  }
};
