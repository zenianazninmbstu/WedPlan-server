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