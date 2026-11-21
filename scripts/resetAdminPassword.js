import "dotenv/config";
import { auth, adminResetTokenPromise } from "../config/auth.js";

const resetAdminPassword = async () => {
  const email = process.env.ADMIN_EMAIL;
  const newPassword = process.env.ADMIN_PASSWORD;

  if (!email || !newPassword) {
    throw new Error("Admin email or password is missing in .env");
  }

  await auth.api.requestPasswordReset({
    body: { email },
  });

  const token = await Promise.race([
    adminResetTokenPromise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Timed out waiting for reset token")),
        10000
      )
    ),
  ]);

  const resetResult = await auth.api.resetPassword({
    body: { token, newPassword },
  });

  console.log("Reset API response:", resetResult);

  const loginTest = await auth.api.signInEmail({
    body: { email, password: newPassword },
  });

  console.log("Backend login test:", loginTest ? "SUCCESS" : "FAILED");
};

resetAdminPassword().catch((error) => {
  console.error("Admin password reset failed:", error.message);
  process.exitCode = 1;
});