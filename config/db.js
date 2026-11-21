
import "dotenv/config";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
});

let db;
let connectionPromise;

const connectDB = async () => {
  if (db) return db;

  if (!connectionPromise) {
    connectionPromise = client
      .connect()
      .then(async () => {
        db = client.db(dbName);
        await db.admin().ping();

        console.log("MongoDB connected successfully!");

        return db;
      })
      .catch((error) => {
        connectionPromise = null;
        console.error("MongoDB connection failed:", error.message);
        throw error;
      });
  }

  return connectionPromise;
};

export { connectDB, client };
