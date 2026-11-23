
import { client } from "../config/db.js";

export const getAdminStats = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const usersCollection = db.collection("user");
    const servicesCollection = db.collection("services");
    const transactionsCollection = db.collection("transactions");

    const [
      totalUsers,
      totalVendors,
      totalCustomers,
      totalServices,
      pendingServices,
      totalTransactions,
      revenueResult,
    ] = await Promise.all([
      usersCollection.countDocuments({}),
      usersCollection.countDocuments({ role: "vendor" }),
      usersCollection.countDocuments({ role: "customer" }),
      servicesCollection.countDocuments({}),
      servicesCollection.countDocuments({ status: "pending" }),
      transactionsCollection.countDocuments({ status: "paid" }),
      transactionsCollection.aggregate([
        { $match: { status: "paid" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
          },
        },
      ]).toArray(),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalVendors,
        totalCustomers,
        totalServices,
        pendingServices,
        totalTransactions,
        totalRevenue: revenueResult[0]?.totalRevenue || 0,
      },
    });
  } catch (error) {
    console.error("Get admin stats failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve admin statistics",
    });
  }
};
