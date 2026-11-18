import "dotenv/config";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
});

let db;

const connectDB = async () => {
  try {
    await client.connect();

    db = client.db(dbName);

    await db.admin().ping();

    console.log("MongoDB connected successfully!");

    return db;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export { connectDB, client };
