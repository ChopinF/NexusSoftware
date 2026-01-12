import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer } from "http";
import { db, migrate } from "./utils/db.js";
import { seed } from "./utils/seed.js";
import { initSocket } from "./utils/socket.js";
import { dirs } from "./config/constants.js";

import productRoutes from "./routes/productsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import negotiationRoutes from "./routes/negotiationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

app.use("/uploads", express.static("uploads"));

const httpServer = createServer(app);

initSocket(httpServer);

app.use("/", productRoutes);
app.use("/", authRoutes);
app.use("/", orderRoutes);
app.use("/", userRoutes);
app.use("/", negotiationRoutes);
app.use("/", chatRoutes);
app.use("/", notificationRoutes);

app.use((err, _req, res, _next) => {
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal error" });
});

const PORT = process.env.PORT || 3000;

async function main() {
  await migrate();

  // DB population - uncomment at first run
  await seed();

  httpServer.listen(PORT, () =>
    console.log(`Listening on http://localhost:${PORT}`)
  );

  process.on("SIGINT", () => db.close(() => process.exit(0)));
}

main().catch((e) => {
  console.error("Fatal startup error:", e);
  process.exit(1);
});
