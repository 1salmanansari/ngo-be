import app from "./app.js";
import { connectDB } from "./config/db.js";
import { User } from "./models/User.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 8000;

async function seedAdminUser() {
  try {
    const adminExists = await User.findOne({ username: "admin" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin", 10);
      await User.create({
        name: "Camp Administrator",
        username: "admin",
        password: hashedPassword,
        role: "ADMIN",
      });
      console.log(
        '[Seed] Default admin user initialized: username: "admin", password: "admin"',
      );
    }

    const selfUserExists = await User.findOne({ username: "self_patient" });
    if (!selfUserExists) {
      const hashedPassword = await bcrypt.hash("self_patient_secure_pass", 10);
      await User.create({
        id: "self_patient",
        name: "Self Registration",
        username: "self_patient",
        password: hashedPassword,
        role: "PATIENT",
      });
      console.log(
        '[Seed] System user "self_patient" initialized for patient self-enrollment',
      );
    }
  } catch (err) {
    console.error("[Seed] Error checking/seeding admin user:", err);
  }
}

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    await seedAdminUser();

    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` Pragati Foundation Camp Backend API`);
      console.log(` Running on: http://localhost:${PORT}`);
      console.log(` API Base:   http://localhost:${PORT}/api/v1`);
      console.log(` Health:     http://localhost:${PORT}/api/v1/health`);
      console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`=======================================================`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Gracefully shutting down...`);
      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
