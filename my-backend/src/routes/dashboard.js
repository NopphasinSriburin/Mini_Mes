import { Router } from "express";
import { query } from "../db/pool.js";
import { authRequired } from "../middleware.js";

const router = Router();
router.use(authRequired);

// GET /api/dashboard/summary — ตัวเลขสรุปสำหรับหน้า dashboard
router.get("/summary", async (_req, res) => {
  const [wo, machines, maint, yield_] = await Promise.all([
    query(`SELECT
              COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress,
              COUNT(*) FILTER (WHERE status = 'COMPLETED')   AS completed,
              COALESCE(SUM(qty_good), 0)   AS total_good,
              COALESCE(SUM(qty_defect), 0) AS total_defect
            FROM work_orders`),
    query(`SELECT status, COUNT(*)::int AS count FROM machines GROUP BY status`),
    query(`SELECT COUNT(*)::int AS open_count FROM maintenance_orders
            WHERE status IN ('OPEN', 'IN_PROGRESS')`),
    query(`SELECT
              COALESCE(SUM(qty_good), 0)   AS good,
              COALESCE(SUM(qty_defect), 0) AS defect
            FROM work_orders`),
  ]);

  const good = Number(yield_.rows[0].good);
  const defect = Number(yield_.rows[0].defect);
  const yieldPct = good + defect > 0 ? Math.round((good / (good + defect)) * 1000) / 10 : null;

  res.json({
    workOrders: wo.rows[0],
    machineStatus: machines.rows,         // [{status, count}]
    openMaintenance: maint.rows[0].open_count,
    qualityYieldPct: yieldPct,            // % ของดี = Quality component ของ OEE
  });
});

export default router;