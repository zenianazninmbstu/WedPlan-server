import { stripe } from "../config/stripe.js";
import { client } from "../config/db.js";



export const createCheckoutSession = async (req, res) => {
  try {
    const db = client.db(process.env.DB_NAME);

    const user = await db.collection("user").findOne({
      id: req.user.sub,
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

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
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
  userId: user.id,
},
subscription_data: {
  metadata: {
    userId: user.id,
  },
},
      success_url: `${process.env.CLIENT_URL}/dashboard/vendor?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard/vendor?payment=cancelled`,
    });

    res.status(200).json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error("Create checkout session failed:", error.message);

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
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.mode !== "subscription") {
        return res.status(200).json({ received: true });
      }

      const userId = session.metadata?.userId;
      const subscriptionId = session.subscription;

      if (!userId || !subscriptionId) {
        return res.status(400).json({
          success: false,
          message: "Subscription information is missing",
        });
      }

      const subscription = await stripe.subscriptions.retrieve(
        subscriptionId
      );

      if (subscription.status !== "active" && subscription.status !== "trialing") {
        return res.status(200).json({ received: true });
      }

      const db = client.db(process.env.DB_NAME);

      const transactionsCollection = db.collection("transactions");

      await db.collection("user").updateOne(
        {
          id: userId,
          role: "vendor",
        },
        {
          $set: {
            subscriptionPlan: "premium",
            subscriptionExpiresAt: new Date(
              subscription.current_period_end * 1000
            ),
            stripeCustomerId: session.customer,
            stripeSubscriptionId: subscriptionId,
            updatedAt: new Date(),
          },
        }
      );
            await transactionsCollection.updateOne(
        {
          stripeSessionId: session.id,
        },
        {
          $setOnInsert: {
            vendorId: userId,
            stripeSessionId: session.id,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: session.customer,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency,
            paymentStatus: session.payment_status,
            status:
              session.payment_status === "paid"
                ? "paid"
                : "pending",
            createdAt: new Date(),
          },
        },
        {
          upsert: true,
        }
      );
    }

        if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;

      if (userId) {
        const db = client.db(process.env.DB_NAME);

        await db.collection("user").updateOne(
          {
            id: userId,
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

      if (userId) {
        const isActive =
          subscription.status === "active" ||
          subscription.status === "trialing";

        await client.db(process.env.DB_NAME)
          .collection("user")
          .updateOne(
            {
              id: userId,
              role: "vendor",
              stripeSubscriptionId: subscription.id,
            },
            {
              $set: {
                subscriptionPlan: isActive ? "premium" : "free",
                subscriptionExpiresAt: isActive
                  ? new Date(subscription.current_period_end * 1000)
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
        const db = client.db(process.env.DB_NAME);

        const user = await db.collection("user").findOne({
          stripeSubscriptionId: subscriptionId,
          role: "vendor",
        });

        if (user) {
          await db.collection("transactions").updateOne(
            { stripeInvoiceId: invoice.id },
            {
              $setOnInsert: {
                vendorId: user.id,
                stripeInvoiceId: invoice.id,
                stripeSubscriptionId: subscriptionId,
                amount: invoice.amount_paid / 100,
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
      .find({})
      .sort({ createdAt: -1 })
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