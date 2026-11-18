
import { client } from "../config/db.js";

export const getAllUsers = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const { search, role, status } = req.query;

    const filter = {};

    if (search) {
     const safeSearch = search.replace(
             /[.*+?^${}()|[\]\\]/g,
             "\\$&"
      );

      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (role && ["customer", "vendor"].includes(role)) {
      filter.role = role;
    }

    if (status === "blocked") {
      filter.isBlocked = true;
    } else if (status === "active") {
      filter.isBlocked = false;
    }

    const users = await db.collection("user")
      .find(filter)
      .project({
        _id: 0,
        id: 1,
        name: 1,
        email: 1,
        image: 1,
        role: 1,
        isBlocked: 1,
        businessName: 1,
        subscriptionPlan: 1,
        createdAt: 1,
      })
      .toArray();

    res.status(200).json({
      success: true,
      totalUsers: users.length,
      users,
    });
  } catch (error) {
    console.error("Get users failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve users",
    });
  }
};
