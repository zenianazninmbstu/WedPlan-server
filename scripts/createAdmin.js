
import "dotenv/config";
import { connectDB } from "../config/db.js";
import { auth } from "../config/auth.js";

const createAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME;

  if (!email || !password || !name) {
    throw new Error("Admin environment variables are missing");
  }

  const db = await connectDB();

  const existingUser = await db.collection("user").findOne({
    email,
  });

  if (existingUser) {
    throw new Error("This email already has an account");
  }

  await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });

  await db.collection("user").updateOne(
    { email },
    {
      $set: {
        role: "admin",
        isBlocked: false,
      },
    }
  );

  console.log("Admin account created successfully!");
};

createAdmin().catch((error) => {
  console.error("Admin creation failed:", error.message);
  process.exitCode = 1;
});
