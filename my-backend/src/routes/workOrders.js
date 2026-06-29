import { Router } from "express";
import { query, withTransaction } from "../db/pool.js";
import { authRequired, requireRole } from "../middleware.js";

const router = Router();
router.use(authRequired);

// GET /api/work-orders — รายการใบสั่งผลิต (กรองด้วย ?status= ได้)
router.get("/", async (req, res) => {
  const { status } = req.query;
  const params = [];
  let sql = `
    SELECT wo.id, wo.wo_no, wo.qty_target, wo.qty_good, wo.qty_defect,
           wo.status, wo.actual_start, wo.actual_end,
           p.product_code, p.name AS product_name
    FROM work_orders wo
    JOIN products p ON p.id = wo.product_id`;
  if (status) {
    params.push(status);
    sql += ` WHERE wo.status = $1`;
  }
  sql += ` ORDER BY wo.created_at DESC`;
  const { rows } = await query(sql, params);
  res.json(rows);
});

// GET /api/work-orders/:id — รายละเอียด + ชิ้นงานที่ผลิตแล้ว
router.get("/:id", async (req, res) => {
  const { rows: woRows } = await query(
    `SELECT wo.*, p.product_code, p.name AS product_name
     FROM work_orders wo JOIN products p ON p.id = wo.product_id
     WHERE wo.id = $1`,
    [req.params.id]
  );
  if (!woRows[0]) return res.status(404).json({ error: "ไม่พบใบสั่งผลิต" });

  const { rows: units } = await query(
    `SELECT pu.serial_no, pu.result, pu.produced_at,
            m.machine_code, u.full_name AS operator
     FROM production_units pu
     LEFT JOIN machines m ON m.id = pu.machine_id
     LEFT JOIN users u ON u.id = pu.operator_id
     WHERE pu.work_order_id = $1
     ORDER BY pu.produced_at DESC`,
    [req.params.id]
  );

  res.json({ ...woRows[0], units });
});

// POST /api/work-orders — สร้างใบสั่งผลิต (เฉพาะ ENGINEER/ADMIN)
router.post("/", requireRole("ENGINEER", "ADMIN"), async (req, res) => {
  const { woNo, productId, qtyTarget } = req.body;
  if (!woNo || !productId || !qtyTarget) {
    return res.status(400).json({ error: "กรุณากรอก woNo, productId, qtyTarget" });
  }
  const { rows } = await query(
    `INSERT INTO work_orders (wo_no, product_id, qty_target, status, created_by)
     VALUES ($1, $2, $3, 'PLANNED', $4) RETURNING *`,
    [woNo, productId, qtyTarget, req.user.id]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/work-orders/:id/status — เปลี่ยนสถานะ (ตั้งเวลาเริ่ม/จบอัตโนมัติ)
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  const valid = ["PLANNED", "RELEASED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: "สถานะไม่ถูกต้อง" });
  }
  const { rows } = await query(
    `UPDATE work_orders
     SET status = $1,
         actual_start = CASE WHEN $1 = 'IN_PROGRESS' AND actual_start IS NULL THEN NOW() ELSE actual_start END,
         actual_end   = CASE WHEN $1 = 'COMPLETED' THEN NOW() ELSE actual_end END
     WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบสั่งผลิต" });
  res.json(rows[0]);
});

// POST /api/work-orders/:id/units — บันทึกผลิต 1 ชิ้น + ตัดสต็อกวัตถุดิบ (transaction)
// body: { serialNo, machineId, result, materials: [{ lotId, qtyUsed }] }
router.post("/:id/units", async (req, res) => {
  const woId = req.params.id;
  const { serialNo, machineId, result = "PASS", materials = [] } = req.body;
  if (!serialNo) return res.status(400).json({ error: "ต้องระบุ serialNo" });

  try {
    const created = await withTransaction(async (client) => {
      // 1) สร้างชิ้นงาน
      const { rows: unitRows } = await client.query(
        `INSERT INTO production_units (serial_no, work_order_id, machine_id, operator_id, result)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, serial_no, result, produced_at`,
        [serialNo, woId, machineId || null, req.user.id, result]
      );
      const unit = unitRows[0];

      // 2) ผูกวัตถุดิบที่ใช้ + ตัดสต็อกจากล็อต
      for (const m of materials) {
        await client.query(
          `INSERT INTO unit_material_usage (production_unit_id, material_lot_id, qty_used)
           VALUES ($1, $2, $3)`,
          [unit.id, m.lotId, m.qtyUsed]
        );
        await client.query(
          `UPDATE material_lots SET qty_remaining = qty_remaining - $1 WHERE id = $2`,
          [m.qtyUsed, m.lotId]
        );
      }

      // 3) อัปเดตยอดดี/เสียในใบสั่งผลิต
      const col = result === "PASS" ? "qty_good" : "qty_defect";
      await client.query(
        `UPDATE work_orders SET ${col} = ${col} + 1 WHERE id = $1`,
        [woId]
      );

      return unit;
    });

    res.status(201).json(created);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "serial นี้ถูกใช้ไปแล้ว" });
    }
    console.error(err);
    res.status(500).json({ error: "บันทึกชิ้นงานไม่สำเร็จ" });
  }
});

export default router;