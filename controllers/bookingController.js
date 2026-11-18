import { ObjectId } from "mongodb";
import { client } from "../config/db.js";

export const createBooking = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const { serviceId, eventDate, eventLocation, message } = req.body;

    if (
      !ObjectId.isValid(serviceId) ||
      !eventDate ||
      !eventLocation?.trim() ||
      !message?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "All booking fields are required",
      });
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const parsedDate = new Date(`${eventDate}T00:00:00.000Z`);

    if (
      typeof eventDate !== "string" ||
      !datePattern.test(eventDate) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== eventDate
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