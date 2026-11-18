
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

export const updateUserStatus = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);
    const { userId } = req.params;


    const { isBlocked } = req.body;

    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isBlocked must be true or false",
      });
    }
    
    if (userId === req.user.sub && isBlocked === true) {
  return res.status(403).json({
    success: false,
    message: "You cannot block your own account",
  });
}
    

    const result = await db.collection("user").updateOne(
      {
        id: userId,
        role: { $in: ["customer", "vendor"] },
      },
      {
        $set: {
          isBlocked,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: isBlocked
        ? "User blocked successfully"
        : "User unblocked successfully",
    });
  } catch (error) {
    console.error("Update user status failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const user = await db.collection("user").findOne(
      { id: req.user.sub },
      {
        projection: {
          _id: 0,
          id: 1,
          name: 1,
          email: 1,
          image: 1,
          role: 1,
          businessName: 1,
          subscriptionPlan: 1,
          subscriptionExpiresAt: 1,
          createdAt: 1,
        },
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get profile failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve profile",
    });
  }
};


export const updateMyProfile = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const { name, image, businessName } = req.body;

    const updateData = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name is required",
        });
      }

      updateData.name = name.trim();
    }

    if (image !== undefined) {
      if (typeof image !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid profile image",
        });
      }

      updateData.image = image.trim();
    }

    if (businessName !== undefined) {
      if (
        typeof businessName !== "string" ||
        !businessName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Business name is required",
        });
      }

      updateData.businessName = businessName.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No profile information provided",
      });
    }

    updateData.updatedAt = new Date();

    const result = await db.collection("user").updateOne(
      { id: req.user.sub },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};