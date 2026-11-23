
import { stripe } from "../config/stripe.js";
import { client } from "../config/db.js";
import { ObjectId } from "mongodb";

export const createCheckoutSession = async (req, res) => {
  try {
    
    if (!ObjectId.isValid(req.user.sub)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const db = client.db(process.env.DB_NAME);

    const user = await db.collection("user").findOne({
      _id: new ObjectId(req.user.sub),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "vendor") {
      return res.status(403).json({
        success: false,
        message: "Only vendors can upgrade their subscription",
      });
    }

    if (
      user.subscriptionPlan === "premium" &&
      user.subscriptionExpiresAt &&
      new Date(user.subscriptionExpiresAt) > new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "You already have an active Premium subscription",
      });
    }

    const userId = user._id.toString();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "WedPlan Premium Subscription",
            },
            unit_amount: 1900,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    });

    res.status(200).json({
      success: true,
      url: session.url,
    });
  } catch (error) {
   console.error("Create checkout session failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create checkout session",
    });
  }
};

export const handleStripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error.message);
    return res.status(400).send("Invalid webhook signature");
  }

  try {
    const db = client.db(process.env.DB_NAME);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.mode !== "subscription") {
        return res.status(200).json({ received: true });
      }

      const userId = session.metadata?.userId;
      const subscriptionId = session.subscription;

      if (!userId || !ObjectId.isValid(userId) || !subscriptionId) {
        return res.status(400).json({
          success: false,
          message: "Subscription information is missing or invalid",
        });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (!["active", "trialing"].includes(subscription.status)) {
        return res.status(200).json({ received: true });
      }

      await db.collection("user").updateOne(
        {
          _id: new ObjectId(userId),
          role: "vendor",
        },
        {
          $set: {
            subscriptionPlan: "premium",
            subscriptionExpiresAt: new Date(
           subscription.items.data[0].current_period_end * 1000
              ),
            stripeCustomerId: session.customer,
            stripeSubscriptionId: subscriptionId,
            updatedAt: new Date(),
          },
        }
      );

      await db.collection("transactions").updateOne(
        { stripeSessionId: session.id },
        {
          $setOnInsert: {
            vendorId: userId,
            stripeSessionId: session.id,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: session.customer,
            amount: (session.amount_total || 0) / 100,
            plan: "premium",
            currency: session.currency,
            paymentStatus: session.payment_status,
            status: session.payment_status === "paid" ? "paid" : "pending",
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;

      if (userId && ObjectId.isValid(userId)) {
        await db.collection("user").updateOne(
          {
            _id: new ObjectId(userId),
            role: "vendor",
            stripeSubscriptionId: subscription.id,
          },
          {
            $set: {
              subscriptionPlan: "free",
              subscriptionExpiresAt: null,
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;

      if (userId && ObjectId.isValid(userId)) {
        const isActive = ["active", "trialing"].includes(subscription.status);

        await db.collection("user").updateOne(
          {
            _id: new ObjectId(userId),
            role: "vendor",
            stripeSubscriptionId: subscription.id,
          },
          {
            $set: {
              subscriptionPlan: isActive ? "premium" : "free",
             subscriptionExpiresAt: isActive

             ? new Date(
             subscription.items.data[0].current_period_end * 1000
             )
             : null,
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;

      if (subscriptionId) {
        const user = await db.collection("user").findOne({
          stripeSubscriptionId: subscriptionId,
          role: "vendor",
        });

        if (user) {
          await db.collection("transactions").updateOne(
            { stripeInvoiceId: invoice.id },
            {
              $setOnInsert: {
                vendorId: user._id.toString(),
                stripeInvoiceId: invoice.id,
                stripeSubscriptionId: subscriptionId,
                amount: invoice.amount_paid / 100,
                plan: "premium",
                currency: invoice.currency,
                paymentStatus: "paid",
                status: "paid",
                createdAt: new Date(),
              },
            },
            { upsert: true }
          );
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};


export const getAllTransactions = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const transactions = await db
      .collection("transactions")
      .aggregate([
        {
          $addFields: {
            vendorObjectId: {
              $convert: {
                input: "$vendorId",
                to: "objectId",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        {
          $lookup: {
            from: "user",
            localField: "vendorObjectId",
            foreignField: "_id",
            as: "vendorData",
          },
        },
        {
          $unwind: {
            path: "$vendorData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            vendorId: 1,
            vendor: {
              name: "$vendorData.name",
              email: "$vendorData.email",
            },
            plan: { $ifNull: ["$plan", "premium"] },
            amount: 1,
            currency: 1,
            status: { $ifNull: ["$status", "$paymentStatus"] },
            createdAt: 1,
            stripeSessionId: 1,
            stripeInvoiceId: 1,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray();

    res.status(200).json({
      success: true,
      total: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Get transactions failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to get transactions",
    });
  }
};


export const getMySubscription = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.user.sub)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const db = client.db(process.env.DB_NAME);

    // Get the logged-in vendor's subscription
    const user = await db.collection("user").findOne(
      {
        _id: new ObjectId(req.user.sub),
        role: "vendor",
      },
      {
        projection: {
          subscriptionPlan: 1,
          subscriptionExpiresAt: 1,
        },
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Get only the logged-in vendor's payment records
    const transactions = await db
      .collection("transactions")
      .find({
        vendorId: req.user.sub,
      })
      .project({
        _id: 1,
        plan: 1,
        amount: 1,
        currency: 1,
        status: 1,
        paymentStatus: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      subscription: {
        plan: user.subscriptionPlan || "free",
        expiresAt: user.subscriptionExpiresAt || null,
      },
      transactions,
    });
  } catch (error) {
    console.error("Get vendor subscription failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get subscription details",
    });
  }
};

