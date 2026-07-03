import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./src/routes/auth.js";
import workOrderRoutes from "./src/routes/workOrders.js";
import traceRoutes from "./src/routes/trace.js";
import maintenanceRoutes from "./src/routes/maintenance.js";
import dashboardRoutes from "./src/routes/dashboard.js";
import productRoutes from "./src/routes/products.js";
import materialRoutes from "./src/routes/materials.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/work-orders", workOrderRoutes);
app.use("/api/trace", traceRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/products", productRoutes);
app.use("/api/materials", materialRoutes);

app.use((_req, res) => res.status(404).json({ error: "ไม่พบ endpoint นี้" }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Mini MES server running at http://localhost:${PORT}`);
});