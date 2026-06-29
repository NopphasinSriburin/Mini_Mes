import { Router } from "express";
import { query } from "../db/pool.js";
import { authRequired } from "../middleware.js";

const router = Router();
router.use(authRequired);

// GET /api/maintenance — รายการใบแจ้งซ่อม (กรอง ?status=)
router.get("/", async (req, res) => {
  const { status } = req.query;
  const params = [];
  let sql = `
    SELECT mo.id, mo.mo_no, mo.type, mo.status, mo.problem,
           mo.reported_at, mo.finished_at, mo.downtime_min,
           m.machine_code, m.name AS machine_name,
           r.full_name AS reported_by, a.full_name AS assigned_to
    FROM maintenance_orders mo
    JOIN machines m ON m.id = mo.machine_id
    LEFT JOIN users r ON r.id = mo.reported_by
    LEFT JOIN users a ON a.id = mo.assigned_to`;
  if (status) {
    params.push(status);
    sql += ` WHERE mo.status = $1`;
  }
  sql += ` ORDER BY mo.reported_at DESC`;
  const { rows } = await query(sql, params);
  res.json(rows);
});

// POST /api/maintenance — แจ้งซ่อม (operator แจ้งได้ + ตั้งเครื่องเป็น DOWN)
router.post("/", async (req, res) => {
  const { moNo, machineId, type = "BREAKDOWN", problem } = req.body;
  if (!moNo || !machineId) {
    return res.status(400).json({ error: "ต้องระบุ moNo และ machineId" });
  }
  const { rows } = await query(
    `INSERT INTO maintenance_orders (mo_no, machine_id, type, status, problem, reported_by)
     VALUES ($1, $2, $3, 'OPEN', $4, $5) RETURNING *`,
    [moNo, machineId, type, problem || null, req.user.id]
  );
  // เครื่องที่แจ้งซ่อมแบบ breakdown -> สถานะ DOWN
  if (type === "BREAKDOWN") {
    await query(`UPDATE machines SET status = 'DOWN' WHERE id = $1`, [machineId]);
  }
  res.status(201).json(rows[0]);
});

// PATCH /api/maintenance/:id/close — ปิดงานซ่อม + บันทึก downtime + คืนเครื่อง
router.patch("/:id/close", async (req, res) => {
  const { actionTaken, downtimeMin } = req.body;
  const { rows } = await query(
    `UPDATE maintenance_orders
     SET status = 'DONE', action_taken = $1, downtime_min = $2, finished_at = NOW()
     WHERE id = $3 RETURNING *`,
    [actionTaken || null, downtimeMin || null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบแจ้งซ่อม" });
  await query(`UPDATE machines SET status = 'IDLE' WHERE id = $1`, [rows[0].machine_id]);
  res.json(rows[0]);
});

// GET /api/maintenance/machines/all — สถานะเครื่องทุกตัว (สำหรับ dashboard)
router.get("/machines/all", async (_req, res) => {
  const { rows } = await query(
    `SELECT id, machine_code, name, line_name, status FROM machines ORDER BY machine_code`
  );
  res.json(rows);
});

export default router;