
import { createRemoteJWKSet, jwtVerify } from "jose";

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

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: authBaseURL,
      audience: authBaseURL,
    });

    if (typeof payload.sub !== "string") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid user token",
      });
    }

    req.user = payload;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
    });
  }
};
