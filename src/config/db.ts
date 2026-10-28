import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://zenansari0:ansari911@shams.4xcqxxp.mongodb.net/demo?appName=shams";

export const connectDB = async (): Promise<typeof mongoose> => {
  try {
    // High-performance connection pool settings optimized for 100+ req/sec
    const conn = await mongoose.connect(MONGO_URI, {
      maxPoolSize: 50,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
    });

    console.log(
      `[MongoDB] Connected successfully to host: ${conn.connection.host}`,
    );
    return conn;
  } catch (error) {
    console.error("[MongoDB] Connection error:", error);
    process.exit(1);
  }
};
