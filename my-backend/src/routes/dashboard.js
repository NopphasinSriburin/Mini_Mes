import { Router } from "express";
import { query } from "../db/pool.js";
import { authRequired } from "../middleware.js";

const router = Router();
router.use(authRequired);

// GET /api/dashboard/summary — ตัวเลขสรุป + รายการเชิงลึกสำหรับหน้า dashboard
router.get("/summary", async (_req, res) => {
  const [wo, machines, maint, yield_, inProgressOrders, lowStockLots, downMachines] = await Promise.all([
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

    // WO ที่กำลังผลิตอยู่ — โชว์บน dashboard พร้อม progress
    query(`SELECT wo.id, wo.wo_no, wo.qty_target, wo.qty_good, wo.qty_defect,
                  p.name AS product_name
           FROM work_orders wo
           JOIN products p ON p.id = wo.product_id
           WHERE wo.status = 'IN_PROGRESS'
           ORDER BY wo.actual_start DESC
           LIMIT 6`),

    // ล็อตวัตถุดิบที่ผูกกับ WO ที่กำลังผลิต และเหลือน้อยกว่า 20% ของที่รับเข้า — เตือนล่วงหน้าก่อนสต็อกหมด
    query(`SELECT DISTINCT ml.id, ml.lot_no, ml.qty_remaining, ml.qty_received,
                  mat.name AS material_name, wo.wo_no,
                  (ml.qty_remaining::numeric / ml.qty_received::numeric) AS remaining_ratio
           FROM work_order_materials wom
           JOIN material_lots ml ON ml.id = wom.material_lot_id
           JOIN materials mat ON mat.id = ml.material_id
           JOIN work_orders wo ON wo.id = wom.work_order_id
           WHERE wo.status = 'IN_PROGRESS'
             AND ml.qty_received > 0
             AND (ml.qty_remaining::numeric / ml.qty_received::numeric) < 0.2
           ORDER BY remaining_ratio ASC
           LIMIT 10`),

    // เครื่องจักรที่ DOWN พร้อมปัญหาล่าสุดจากใบแจ้งซ่อมที่ยังไม่ปิด
    query(`SELECT m.machine_code, m.name AS machine_name, mo.mo_no, mo.problem
           FROM machines m
           LEFT JOIN LATERAL (
             SELECT mo_no, problem FROM maintenance_orders
             WHERE machine_id = m.id AND status IN ('OPEN', 'IN_PROGRESS')
             ORDER BY reported_at DESC LIMIT 1
           ) mo ON true
           WHERE m.status = 'DOWN'`),
  ]);

  const good = Number(yield_.rows[0].good);
  const defect = Number(yield_.rows[0].defect);
  const yieldPct = good + defect > 0 ? Math.round((good / (good + defect)) * 1000) / 10 : null;

  res.json({
    workOrders: wo.rows[0],
    machineStatus: machines.rows,
    openMaintenance: maint.rows[0].open_count,
    qualityYieldPct: yieldPct,
    inProgressOrders: inProgressOrders.rows,
    lowStockLots: lowStockLots.rows,
    downMachines: downMachines.rows,
  });
});

export default router;