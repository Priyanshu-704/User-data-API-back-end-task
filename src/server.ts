import dotenv from "dotenv";
import { startServer } from "./app";

dotenv.config();

const PORT = process.env.PORT || 3000;

const app = startServer(PORT);

const gracefulShutdown = () => {
  console.log("\n Received shutdown signal, closing server...");

  setTimeout(() => {
    console.log("Server closed gracefully");
    process.exit(0);
  }, 1000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(" Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
