import { ObjectId } from "mongodb";
import { client } from "../config/db.js";



export const getPendingServices = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const services = await db.collection("services")
      .find({ status: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      totalServices: services.length,
      services,
    });
  } catch (error) {
    console.error("Get pending services failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve pending services",
    });
  }
};

export const updateServiceStatus = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const { serviceId } = req.params;
    const { status } = req.body;


    if (!ObjectId.isValid(serviceId)) {
  return res.status(400).json({
    success: false,
    message: "Invalid service ID",
  });
}

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected",
      });
    }

    const result = await db.collection("services").updateOne(
      {
      _id: new ObjectId(serviceId),
        status: "pending",
      },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Pending service not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Service ${status} successfully`,
    });
  } catch (error) {
    console.error("Update service status failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to update service status",
    });
  }
};

export const updateServiceVisibility = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const { serviceId } = req.params;
    const { isActive } = req.body;

    if (!ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    const result = await db.collection("services").updateOne(
      {
        _id: new ObjectId(serviceId),
        status: "approved",
      },
      {
        $set: {
          isActive,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Approved service not found",
      });
    }

    res.status(200).json({
      success: true,
      message: isActive
        ? "Service published successfully"
        : "Service unpublished successfully",
    });
  } catch (error) {
    console.error("Update service visibility failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to update service visibility",
    });
  }
};

export const deleteService = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const { serviceId } = req.params;

    if (!ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID",
      });
    }

    const result = await db.collection("services").deleteOne({
      _id: new ObjectId(serviceId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Delete service failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to delete service",
    });
  }
};