import { ObjectId } from "mongodb";
import { client } from "../config/db.js";

export const createBooking = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const { serviceId, eventDate, eventLocation, message } = req.body;

    if (
  !ObjectId.isValid(serviceId) ||
  typeof eventLocation !== "string" ||
  !eventLocation.trim() ||
  typeof message !== "string" ||
  !message.trim() ||
  typeof eventDate !== "string" ||
  !eventDate
) {
  return res.status(400).json({
    success: false,
    message: "All booking fields are required",
  });
}

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const parsedDate = new Date(`${eventDate}T00:00:00.000Z`);
    const today = new Date().toISOString().slice(0, 10);
    if (
      typeof eventDate !== "string" ||
      !datePattern.test(eventDate) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== eventDate ||
      eventDate < today
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid event date",
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
        message: "Service is not available for booking",
      });
    }

    if (service.vendorId === req.user.sub) {
      return res.status(403).json({
        success: false,
        message: "You cannot book your own service",
      });
    }

    const existingBooking = await db.collection("bookings").findOne({
      customerId: req.user.sub,
      serviceId: new ObjectId(serviceId),
      eventDate,
      status: { $in: ["pending", "accepted"] },
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: "You already have an active booking for this service and date",
      });
    }


    if (message.trim().length > 1000) {
  return res.status(400).json({
    success: false,
    message: "Booking message cannot exceed 1000 characters",
  });
}

if (eventLocation.trim().length > 300) {
  return res.status(400).json({
    success: false,
    message: "Event location cannot exceed 300 characters",
  });
}

    const newBooking = {
      serviceId: new ObjectId(serviceId),
      vendorId: service.vendorId,
      customerId: req.user.sub,
      eventDate,
      eventLocation: eventLocation.trim(),
      message: message.trim(),
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("bookings").insertOne(newBooking);

    res.status(201).json({
      success: true,
      message: "Booking request submitted successfully",
      bookingId: result.insertedId,
    });
  } catch (error) {
    console.error("Create booking failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to create booking",
    });
  }
};

export const getCustomerBookings = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const bookings = await db.collection("bookings")
      .aggregate([
        {
          $match: {
            customerId: req.user.sub,
          },
        },
        {
          $lookup: {
            from: "services",
            localField: "serviceId",
            foreignField: "_id",
            as: "service",
          },
        },
        {
          $unwind: {
            path: "$service",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ])
      .toArray();

    res.status(200).json({
      success: true,
      totalBookings: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get customer bookings failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve bookings",
    });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const { bookingId } = req.params;

    if (!ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const result = await db.collection("bookings").updateOne(
      {
        _id: new ObjectId(bookingId),
        customerId: req.user.sub,
        status: "pending",
      },
      {
        $set: {
          status: "cancelled",
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Pending booking not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel booking failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
    });
  }
};


export const getVendorBookings = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);
    const bookings = await db.collection("bookings")
      .aggregate([
        {
          $match: {
            vendorId: req.user.sub,
          },
        },
        {
          $lookup: {
            from: "services",
            localField: "serviceId",
            foreignField: "_id",
            as: "service",
          },
        },
        {
          $unwind: {
            path: "$service",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "user",
            let: { customerId: "$customerId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      { $toString: "$_id" },
                      "$$customerId",
                    ],
                  },
                },
              },
              {
                $project: {
                  name: 1,
                  email: 1,
                },
              },
            ],
            as: "customer",
          },
        },
        {
          $unwind: {
            path: "$customer",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            customerName: {
              $ifNull: ["$customer.name", "Customer"],
            },
            customerEmail: {
              $ifNull: ["$customer.email", ""],
            },
            serviceName: {
              $ifNull: ["$service.name", "Service"],
            },
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ])
      .toArray();

    res.status(200).json({
      success: true,
      totalBookings: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get vendor bookings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch booking requests.",
    });
  }
};


export const updateBookingStatus = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const { bookingId } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be accepted or rejected",
      });
    }

    const result = await db.collection("bookings").updateOne(
      {
        _id: new ObjectId(bookingId),
        vendorId: req.user.sub,
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
        message: "Pending booking request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Booking ${status} successfully`,
    });
  } catch (error) {
    console.error("Update booking status failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to update booking status",
    });
  }
};