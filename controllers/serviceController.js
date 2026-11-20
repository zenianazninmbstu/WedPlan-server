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

    const service = await db.collection("services").findOne({
      _id: new ObjectId(serviceId),
      status: "approved",
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Approved service not found",
      });
    }

    // Check the vendor's subscription before publishing
    if (isActive && !service.isActive) {
      const vendor = ObjectId.isValid(service.vendorId)
  ? await db.collection("user").findOne({
      _id: new ObjectId(service.vendorId),
    })
  : null;

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Service vendor not found",
        });
      }

      const isPremium =
        vendor.subscriptionPlan === "premium" &&
        vendor.subscriptionExpiresAt &&
        new Date(vendor.subscriptionExpiresAt) > new Date();

      if (!isPremium) {
        const activeServices = await db.collection("services").countDocuments({
          vendorId: service.vendorId,
          status: "approved",
          isActive: true,
        });

        if (activeServices >= 3) {
          return res.status(403).json({
            success: false,
            message: "Free vendors can have only 3 active services. Upgrade to Premium for unlimited services.",
          });
        }
      }
    }

    await db.collection("services").updateOne(
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

export const getVendorServices = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const services = await db.collection("services")
      .find({ vendorId: req.user.sub })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      totalServices: services.length,
      services,
    });
  } catch (error) {
    console.error("Get vendor services failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve vendor services",
    });
  }
};

export const createService = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const {
      name,
      description,
      category,
      price,
      location,
      images,
    } = req.body;

    const allowedCategories = [
      "Photography & Videography",
      "Wedding Venues",
      "Decoration & Florist",
      "Catering Services",
      "Makeup & Styling",
      "Wedding Fashion",
    ];

    if (
      !name?.trim() ||
      !description?.trim() ||
      !category ||
      !location?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service category",
      });
    }

    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a positive number",
      });
    }

    if (
      !Array.isArray(images) ||
      images.length === 0 ||
      !images.every((image) => typeof image === "string" && image.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one valid service image is required",
      });
    }

    const newService = {
      name: name.trim(),
      description: description.trim(),
      category,
      price,
      location: location.trim(),
      images,
      vendorId: req.user.sub,
      status: "pending",
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("services").insertOne(newService);

    res.status(201).json({
      success: true,
      message: "Service submitted for admin approval",
      serviceId: result.insertedId,
    });
  } catch (error) {
    console.error("Create service failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to create service",
    });
  }
};

export const updateVendorService = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const { serviceId } = req.params;
    const {
      name,
      description,
      category,
      price,
      location,
      images,
    } = req.body;

    const allowedCategories = [
      "Photography & Videography",
      "Wedding Venues",
      "Decoration & Florist",
      "Catering Services",
      "Makeup & Styling",
      "Wedding Fashion",
    ];

    if (!ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID",
      });
    }

    if (
      !name?.trim() ||
      !description?.trim() ||
      !location?.trim() ||
      !allowedCategories.includes(category)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid service information",
      });
    }

    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a positive number",
      });
    }

    if (
      !Array.isArray(images) ||
      images.length === 0 ||
      !images.every((image) => typeof image === "string" && image.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one valid service image is required",
      });
    }

    const result = await db.collection("services").updateOne(
      {
        _id: new ObjectId(serviceId),
        vendorId: req.user.sub,
      },
      {
        $set: {
          name: name.trim(),
          description: description.trim(),
          category,
          price,
          location: location.trim(),
          images,
          status: "pending",
          isActive: false,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Your service was not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Service updated and submitted for approval",
    });
  } catch (error) {
    console.error("Update vendor service failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to update service",
    });
  }
};

export const deleteVendorService = async (req, res) => {
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
      vendorId: req.user.sub,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Your service was not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Your service deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor service failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to delete your service",
    });
  }
};

export const getPublicServices = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const { search, category, location, sort, limit } = req.query;

    const filter = {
      status: "approved",
      isActive: true,
    };

    if (search) {
     const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.name = {
        $regex: safeSearch,
        $options: "i",
      };
    }

    if (category) {
      filter.category = category;
    }

    if (location) {
      filter.location = {
        $regex: location,
        $options: "i",
      };
    }

    let sortOption = { createdAt: -1 };

    const queryLimit = Number(limit);

const limitOption =
  Number.isInteger(queryLimit) && queryLimit > 0
    ? Math.min(queryLimit, 50)
    : 0;

    if (sort === "price-asc") {
      sortOption = { price: 1 };
    } else if (sort === "price-desc") {
      sortOption = { price: -1 };
    }

   let servicesQuery = db.collection("services")
  .find(filter)
  .sort(sortOption);

if (limitOption > 0) {
  servicesQuery = servicesQuery.limit(limitOption);
}

const services = await servicesQuery.toArray();


const servicesWithVendor = await Promise.all(
  services.map(async (service) => {
   const vendor = ObjectId.isValid(service.vendorId)
  ? await db.collection("user").findOne(
      { _id: new ObjectId(service.vendorId) },
      {
        projection: {
          _id: 0,
          name: 1,
          businessName: 1,
          image: 1,
        },
      }
    )
  : null;

    return {
      ...service,
      vendor: vendor
        ? {
            name: vendor.name || "Wedding Vendor",
            businessName: vendor.businessName || "",
            image: vendor.image || "",
          }
        : null,
    };
  })
);

   res.status(200).json({
  success: true,
  totalServices: servicesWithVendor.length,
  services: servicesWithVendor,
});
  } catch (error) {
    console.error("Get public services failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve services",
    });
  }
};

export const getPublicServiceDetails = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const { serviceId } = req.params;

    if (!ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID",
      });
    }

    const service = await db.collection("services").findOne({
      _id: new ObjectId(serviceId),
      status: "approved",
      isActive: true,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).json({
      success: true,
      service,
    });
  } catch (error) {
    console.error("Get public service details failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve service details",
    });
  }
};

// Vendor turns ONE of their own approved services on or off
export const updateVendorServiceAvailability = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const { serviceId } = req.params;
    const { isActive } = req.body;

    // 1. Check the service id
    if (!ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID",
      });
    }

    // 2. isActive must be true or false
    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    // 3. Find the service. It must belong to this vendor and be approved
    const service = await db.collection("services").findOne({
      _id: new ObjectId(serviceId),
      vendorId: req.user.sub,
      status: "approved",
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Approved service not found",
      });
    }

    // 4. If the vendor wants to turn it ON, check the Free plan limit
    if (isActive && !service.isActive) {
      const vendor = ObjectId.isValid(req.user.sub)
        ? await db.collection("user").findOne({
            _id: new ObjectId(req.user.sub),
          })
        : null;

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      // Premium means: plan is premium AND it has not expired
      const isPremium =
        vendor.subscriptionPlan === "premium" &&
        vendor.subscriptionExpiresAt &&
        new Date(vendor.subscriptionExpiresAt) > new Date();

      if (!isPremium) {
        const activeServices = await db.collection("services").countDocuments({
          vendorId: req.user.sub,
          status: "approved",
          isActive: true,
        });

        if (activeServices >= 3) {
          return res.status(403).json({
            success: false,
            message:
              "Free vendors can have only 3 active services. Upgrade to Premium for unlimited services.",
          });
        }
      }
    }

    // 5. Save the new value
    await db.collection("services").updateOne(
      { _id: new ObjectId(serviceId), vendorId: req.user.sub },
      { $set: { isActive, updatedAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: isActive
        ? "Service is now available to customers."
        : "Service is now marked as unavailable.",
    });
  } catch (error) {
    console.error("Update vendor availability failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to update availability",
    });
  }
};
