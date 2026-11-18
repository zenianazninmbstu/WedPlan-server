
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { client } from "./db.js";
import { jwt } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";





const db = client.db(process.env.DB_NAME);

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
  }),

  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },



hooks: {
  before: createAuthMiddleware(async (ctx) => {
    if (ctx.path !== "/sign-up/email") {
      return;
    }

    const password = ctx.body?.password;

    if (
      typeof password !== "string" ||
      password.length < 6
    ) {
      throw new APIError("BAD_REQUEST", {
        message: "Password must be at least 6 characters",
      });
    }

    if (!/[A-Z]/.test(password)) {
      throw new APIError("BAD_REQUEST", {
        message: "Password must contain an uppercase letter",
      });
    }

    if (!/[a-z]/.test(password)) {
      throw new APIError("BAD_REQUEST", {
        message: "Password must contain a lowercase letter",
      });
    }
  }),
},


  user: {
    additionalFields: {
      role: {
      type: ["customer", "vendor", "admin"],
        required: false,
        defaultValue: "customer",
        input: true,
      },
      isBlocked: {
      type: "boolean",
      required: false,
      defaultValue: false,
      input: false,
},
     
      businessName: {
      type: "string",
      required: false,
     input: true,
},

     subscriptionPlan: {
     type: ["free", "premium"],
     required: false,
     defaultValue: "free",
     input: false,
},

    subscriptionExpiresAt: {
    type: "date",
    required: false,
    input: false,
},

    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const role = user.role ?? "customer";

          if (role !== "customer" && role !== "vendor") {
            return false;
          }

          return {
            data: {
              ...user,
              role,
            },
          };
        },
      },

      update: {
        before: async (user) => {
          if (Object.prototype.hasOwnProperty.call(user, "role")) {
            return false;
          }
        },
      },
    },
  },
  plugins: [
  jwt(),
],
});
