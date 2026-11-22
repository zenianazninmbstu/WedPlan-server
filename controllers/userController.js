
import { client } from "../config/db.js";
import { ObjectId } from "mongodb";

export const getAllUsers = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);
    const { search, role, status } = req.query;

    const filter = {};

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
        _id: 1,
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

    const formattedUsers = users.map(({ _id, ...user }) => ({
      ...user,
      id: _id.toString(),
    }));

    res.status(200).json({
      success: true,
      totalUsers: formattedUsers.length,
      users: formattedUsers,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isBlocked } = req.body;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Invalid account status",
      });
    }

    if (userId === req.user.sub && isBlocked) {
      return res.status(403).json({
        success: false,
        message: "You cannot block your own account",
      });
    }

    const db = client.db(process.env.DB_NAME);

    const result = await db.collection("user").updateOne(
      {
        _id: new ObjectId(userId),
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
    console.error("Update user status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.user.sub)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const db = client.db(process.env.DB_NAME);

    const user = await db.collection("user").findOne(
      { _id: new ObjectId(req.user.sub) },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          image: 1,
          role: 1,
          businessName: 1,
          phone: 1,
          location: 1,
          bio: 1,
          subscriptionPlan: 1,
          subscriptionExpiresAt: 1,
          createdAt: 1,
        },
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { _id, ...profile } = user;

    res.status(200).json({
      success: true,
      user: {
        ...profile,
        id: _id.toString(),
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};


export const updateMyProfile = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.user.sub)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const { name, image, businessName, phone, location, bio } = req.body;
    const updateData = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "Name must be between 1 and 100 characters",
        });
      }
      updateData.name = name.trim();
    }

    if (image !== undefined) {
      if (typeof image !== "string" || image.length > 2000) {
        return res.status(400).json({
          success: false,
          message: "Invalid image",
        });
      }
      updateData.image = image.trim();
    }

    if (businessName !== undefined) {
      if (typeof businessName !== "string" || businessName.length > 150) {
        return res.status(400).json({
          success: false,
          message: "Invalid business name",
        });
      }
      updateData.businessName = businessName.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || phone.length > 30) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number",
        });
      }
      updateData.phone = phone.trim();
    }

    if (location !== undefined) {
      if (typeof location !== "string" || location.length > 150) {
        return res.status(400).json({
          success: false,
          message: "Invalid location",
        });
      }
      updateData.location = location.trim();
    }

    if (bio !== undefined) {
      if (typeof bio !== "string" || bio.length > 300) {
        return res.status(400).json({
          success: false,
          message: "Bio cannot exceed 300 characters",
        });
      }
      updateData.bio = bio.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No profile changes provided",
      });
    }

    updateData.updatedAt = new Date();

    const db = client.db(process.env.DB_NAME);

    const result = await db.collection("user").updateOne(
      { _id: new ObjectId(req.user.sub) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

