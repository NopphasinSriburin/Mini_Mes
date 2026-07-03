import { Router } from "express";
import { query, withTransaction } from "../db/pool.js";
import { authRequired, requireRole } from "../middleware.js";

const router = Router();
router.use(authRequired);

// GET /api/work-orders — รายการใบสั่งผลิต (กรองด้วย ?status= ได้)
// ใช้ ?status=COMPLETED สำหรับหน้าประวัติการผลิต
router.get("/", async (req, res) => {
  const { status } = req.query;
  const params = [];
  let sql = `
    SELECT wo.id, wo.wo_no, wo.qty_target, wo.qty_good, wo.qty_defect,
           wo.status, wo.actual_start, wo.actual_end, wo.product_id, wo.machine_id,
           p.product_code, p.name AS product_name,
           m.machine_code, m.name AS machine_name
    FROM work_orders wo
    JOIN products p ON p.id = wo.product_id
    LEFT JOIN machines m ON m.id = wo.machine_id`;
  if (status) {
    params.push(status);
    sql += ` WHERE wo.status = $1`;
  }
  sql += ` ORDER BY wo.created_at DESC`;
  const { rows } = await query(sql, params);
  res.json(rows);
});

// GET /api/work-orders/machines/available — เครื่องที่ "ว่าง" ใช้ตอนสร้าง WO
// ว่าง = ไม่เสีย/ไม่ซ่อมบำรุงอยู่ และไม่ได้ผูกกับ WO อื่นที่กำลัง IN_PROGRESS
router.get("/machines/available", async (_req, res) => {
  const { rows } = await query(
    `SELECT m.id, m.machine_code, m.name, m.line_name, m.status
     FROM machines m
     WHERE m.status NOT IN ('DOWN', 'MAINTENANCE')
       AND NOT EXISTS (
         SELECT 1 FROM work_orders wo
         WHERE wo.machine_id = m.id AND wo.status = 'IN_PROGRESS'
       )
     ORDER BY m.machine_code`
  );
  res.json(rows);
});

// GET /api/work-orders/units/:serial — ค้นชิ้นงานด้วย serial (ใช้หน้า QC ตรวจสอบภายหลัง)
router.get("/units/:serial", async (req, res) => {
  const { rows } = await query(
    `SELECT pu.id, pu.serial_no, pu.result, pu.produced_at,
            pu.reject_reason, pu.rejected_at,
            wo.id AS work_order_id, wo.wo_no, wo.status AS wo_status,
            p.name AS product_name
     FROM production_units pu
     JOIN work_orders wo ON wo.id = pu.work_order_id
     JOIN products p ON p.id = wo.product_id
     WHERE pu.serial_no = $1`,
    [req.params.serial]
  );
  if (!rows[0]) return res.status(404).json({ error: "ไม่พบชิ้นงานนี้" });
  res.json(rows[0]);
});

// GET /api/work-orders/:id — รายละเอียด + ชิ้นงาน + ล็อตวัตถุดิบที่ผูกไว้
router.get("/:id", async (req, res) => {
  const { rows: woRows } = await query(
    `SELECT wo.*, p.product_code, p.name AS product_name
     FROM work_orders wo JOIN products p ON p.id = wo.product_id
     WHERE wo.id = $1`,
    [req.params.id]
  );
  if (!woRows[0]) return res.status(404).json({ error: "ไม่พบใบสั่งผลิต" });

  const { rows: units } = await query(
    `SELECT pu.id, pu.serial_no, pu.result, pu.produced_at,
            pu.reject_reason, pu.rejected_at,
            m.machine_code, u.full_name AS operator
     FROM production_units pu
     LEFT JOIN machines m ON m.id = pu.machine_id
     LEFT JOIN users u ON u.id = pu.operator_id
     WHERE pu.work_order_id = $1
     ORDER BY pu.produced_at DESC`,
    [req.params.id]
  );

  const { rows: reservedMaterials } = await query(
    `SELECT wom.material_lot_id, wom.qty_reserved,
            ml.lot_no, ml.supplier, ml.qty_remaining,
            mat.material_code, mat.name AS material_name
     FROM work_order_materials wom
     JOIN material_lots ml ON ml.id = wom.material_lot_id
     JOIN materials mat ON mat.id = ml.material_id
     WHERE wom.work_order_id = $1`,
    [req.params.id]
  );

  res.json({ ...woRows[0], units, reservedMaterials });
});

// POST /api/work-orders — สร้างใบสั่งผลิต + ผูกล็อตวัตถุดิบที่จะใช้ (เฉพาะ ENGINEER/ADMIN)
// body: { woNo, productId, qtyTarget, materials: [{ lotId, qtyReserved }] }
router.post("/", requireRole("ENGINEER", "ADMIN"), async (req, res) => {
  const { woNo, productId, qtyTarget, machineId, materials = [] } = req.body;
  if (!woNo || !productId || !qtyTarget) {
    return res.status(400).json({ error: "กรุณากรอก woNo, productId, qtyTarget" });
  }

  try {
    const created = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO work_orders (wo_no, product_id, qty_target, status, machine_id, created_by)
         VALUES ($1, $2, $3, 'PLANNED', $4, $5) RETURNING *`,
        [woNo, productId, qtyTarget, machineId || null, req.user.id]
      );
      const wo = rows[0];

      // ผูกล็อตวัตถุดิบที่ engineer เลือกไว้กับ WO นี้
      for (const m of materials) {
        if (!m.lotId) continue;
        await client.query(
          `INSERT INTO work_order_materials (work_order_id, material_lot_id, qty_reserved)
           VALUES ($1, $2, $3)`,
          [wo.id, m.lotId, m.qtyReserved || null]
        );
      }

      return wo;
    });

    res.status(201).json(created);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "เลขที่ใบสั่งผลิตนี้ถูกใช้ไปแล้ว" });
    }
    console.error(err);
    res.status(500).json({ error: "สร้างใบสั่งผลิตไม่สำเร็จ" });
  }
});

// POST /api/work-orders/:id/materials — ผูกล็อตวัตถุดิบเพิ่มเข้า WO ที่มีอยู่แล้ว
// ใช้เมื่อล็อตเดิมหมดกลางทาง ต้องเติมล็อตใหม่ให้ผลิตต่อได้
// body: { lotId, qtyReserved? }  —  เฉพาะ ENGINEER/ADMIN
router.post("/:id/materials", requireRole("ENGINEER", "ADMIN"), async (req, res) => {
  const woId = req.params.id;
  const { lotId, qtyReserved } = req.body;
  if (!lotId) return res.status(400).json({ error: "ต้องระบุ lotId" });

  try {
    await query(
      `INSERT INTO work_order_materials (work_order_id, material_lot_id, qty_reserved)
       VALUES ($1, $2, $3)
       ON CONFLICT (work_order_id, material_lot_id)
       DO UPDATE SET qty_reserved = COALESCE(work_order_materials.qty_reserved, 0) + COALESCE(EXCLUDED.qty_reserved, 0)`,
      [woId, lotId, qtyReserved || null]
    );

    const { rows } = await query(
      `SELECT wom.material_lot_id, wom.qty_reserved,
              ml.lot_no, ml.supplier, ml.qty_remaining,
              mat.material_code, mat.name AS material_name
       FROM work_order_materials wom
       JOIN material_lots ml ON ml.id = wom.material_lot_id
       JOIN materials mat ON mat.id = ml.material_id
       WHERE wom.work_order_id = $1`,
      [woId]
    );
    res.status(201).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เพิ่มล็อตวัตถุดิบไม่สำเร็จ" });
  }
});

// DELETE /api/work-orders/:id/materials/:lotId — เอาล็อตวัตถุดิบออกจาก WO
// ปลอดภัย: ไม่กระทบประวัติการใช้จริง (unit_material_usage) เพราะอ้างอิงล็อตโดยตรง ไม่ผ่านตารางนี้
// เฉพาะ ENGINEER/ADMIN
router.delete("/:id/materials/:lotId", requireRole("ENGINEER", "ADMIN"), async (req, res) => {
  const { id: woId, lotId } = req.params;
  const { rows } = await query(
    `DELETE FROM work_order_materials WHERE work_order_id = $1 AND material_lot_id = $2 RETURNING *`,
    [woId, lotId]
  );
  if (!rows[0]) return res.status(404).json({ error: "ไม่พบล็อตนี้ผูกอยู่กับใบสั่งผลิตนี้" });
  res.json({ removed: true });
});

// DELETE /api/work-orders/:id — ลบใบสั่งผลิต (เฉพาะที่ยังไม่มีการผลิตจริงเลย ป้องกันทำลาย traceability)
// เฉพาะ ENGINEER/ADMIN
router.delete("/:id", requireRole("ENGINEER", "ADMIN"), async (req, res) => {
  const woId = req.params.id;

  const { rows: unitCheck } = await query(
    `SELECT COUNT(*)::int AS count FROM production_units WHERE work_order_id = $1`,
    [woId]
  );
  if (unitCheck[0].count > 0) {
    return res.status(409).json({
      error: "ใบสั่งผลิตนี้มีชิ้นงานที่ผลิตแล้วผูกอยู่ ลบไม่ได้เพื่อรักษาความสามารถตรวจสอบย้อนกลับ",
    });
  }

  try {
    await withTransaction(async (client) => {
      await client.query(`DELETE FROM work_order_materials WHERE work_order_id = $1`, [woId]);
      const { rowCount } = await client.query(`DELETE FROM work_orders WHERE id = $1`, [woId]);
      if (rowCount === 0) throw { status: 404, message: "ไม่พบใบสั่งผลิต" };
    });
    res.json({ deleted: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "ลบใบสั่งผลิตไม่สำเร็จ" });
  }
});

// PATCH /api/work-orders/:id/status — เปลี่ยนสถานะ (เริ่มผลิต / หยุดผลิต)
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  const valid = ["PLANNED", "RELEASED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: "สถานะไม่ถูกต้อง" });
  }
  const { rows } = await query(
    `UPDATE work_orders
     SET status = $1::work_order_status,
         actual_start = CASE WHEN $1::text = 'IN_PROGRESS' AND actual_start IS NULL THEN NOW() ELSE actual_start END,
         actual_end   = CASE WHEN $1::text = 'COMPLETED' THEN NOW() ELSE actual_end END
     WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "ไม่พบใบสั่งผลิต" });
  res.json(rows[0]);
});

// POST /api/work-orders/:id/units — บันทึกผลิต 1 ชิ้น
// ตัดสต็อกวัตถุดิบอัตโนมัติตามสูตร BOM จากล็อตที่ผูกไว้กับ WO นี้ (FIFO)
// เครื่องจักรใช้ตัวที่ผูกไว้กับ WO ตอนสร้าง (ไม่ต้องส่งมาจาก client)
// body: { serialNo, result }
router.post("/:id/units", async (req, res) => {
  const woId = req.params.id;
  const { serialNo, result = "PASS" } = req.body;
  if (!serialNo) return res.status(400).json({ error: "ต้องระบุ serialNo" });

  try {
    const created = await withTransaction(async (client) => {
      // เช็คว่า WO ยังผลิตได้อยู่ (ไม่ใช่ COMPLETED/CANCELLED)
      const { rows: woRows } = await client.query(
        `SELECT id, product_id, status, machine_id FROM work_orders WHERE id = $1 FOR UPDATE`,
        [woId]
      );
      const wo = woRows[0];
      if (!wo) throw { status: 404, message: "ไม่พบใบสั่งผลิต" };
      if (wo.status === "COMPLETED" || wo.status === "CANCELLED") {
        throw { status: 409, message: "ใบสั่งผลิตนี้ปิดงานแล้ว ไม่สามารถบันทึกเพิ่มได้" };
      }

      // 1) สร้างชิ้นงาน — ใช้เครื่องจักรที่ผูกไว้กับ WO นี้ตั้งแต่ตอนสร้าง
      const { rows: unitRows } = await client.query(
        `INSERT INTO production_units (serial_no, work_order_id, machine_id, operator_id, result)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, serial_no, result, produced_at`,
        [serialNo, woId, wo.machine_id || null, req.user.id, result]
      );
      const unit = unitRows[0];

      // 2) ดึงสูตร BOM ของสินค้านี้ — ตัดสต็อกตามสูตร (ใช้แม้เป็นของเสีย เพราะวัตถุดิบถูกใช้ไปจริงแล้ว)
      const { rows: bomItems } = await client.query(
        `SELECT material_id, qty_per_unit FROM bom_items WHERE product_id = $1`,
        [wo.product_id]
      );

      for (const item of bomItems) {
        // หาล็อตที่ผูกไว้กับ WO นี้ สำหรับวัตถุดิบตัวนี้ ที่ยังมีสต็อกพอ (FIFO ตามลำดับที่ผูกไว้)
        const { rows: lotRows } = await client.query(
          `SELECT ml.id, ml.qty_remaining
           FROM work_order_materials wom
           JOIN material_lots ml ON ml.id = wom.material_lot_id
           WHERE wom.work_order_id = $1 AND ml.material_id = $2 AND ml.qty_remaining >= $3
           ORDER BY wom.id ASC
           LIMIT 1
           FOR UPDATE OF ml`,
          [woId, item.material_id, item.qty_per_unit]
        );

        if (lotRows.length === 0) {
          throw {
            status: 409,
            message: `สต็อกวัตถุดิบไม่พอสำหรับผลิตต่อ — กรุณาเพิ่มล็อตวัตถุดิบให้ใบสั่งผลิตนี้`,
          };
        }
        const lot = lotRows[0];

        await client.query(
          `INSERT INTO unit_material_usage (production_unit_id, material_lot_id, qty_used)
           VALUES ($1, $2, $3)`,
          [unit.id, lot.id, item.qty_per_unit]
        );
        await client.query(
          `UPDATE material_lots SET qty_remaining = qty_remaining - $1 WHERE id = $2`,
          [item.qty_per_unit, lot.id]
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
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "บันทึกชิ้นงานไม่สำเร็จ" });
  }
});

// PATCH /api/work-orders/:id/units/:unitId/reject — QC ตีกลับชิ้นงานที่เคย PASS ให้เป็น FAIL
// body: { reason }
// ถ้า WO ปิดงาน (COMPLETED) ไปแล้ว จะเปิดกลับเป็น IN_PROGRESS อัตโนมัติเพื่อให้ผลิตชดเชยได้
router.patch("/:id/units/:unitId/reject", async (req, res) => {
  const { id: woId, unitId } = req.params;
  const { reason } = req.body;

  try {
    const result = await withTransaction(async (client) => {
      const { rows: unitRows } = await client.query(
        `SELECT id, result, work_order_id FROM production_units WHERE id = $1 FOR UPDATE`,
        [unitId]
      );
      const unit = unitRows[0];
      if (!unit) throw { status: 404, message: "ไม่พบชิ้นงานนี้" };
      if (String(unit.work_order_id) !== String(woId)) {
        throw { status: 400, message: "ชิ้นงานนี้ไม่ได้อยู่ในใบสั่งผลิตที่ระบุ" };
      }
      if (unit.result !== "PASS") {
        throw { status: 409, message: "ชิ้นงานนี้ไม่ได้เป็นของดี ตีกลับไม่ได้" };
      }

      // เปลี่ยนสถานะชิ้นงานเป็น FAIL พร้อมบันทึกเหตุผล
      const { rows: updatedUnit } = await client.query(
        `UPDATE production_units
         SET result = 'FAIL', reject_reason = $1, rejected_by = $2, rejected_at = NOW()
         WHERE id = $3 RETURNING *`,
        [reason || null, req.user.id, unitId]
      );

      // ปรับยอดใน WO — ลดของดี เพิ่มของเสีย
      const { rows: woRows } = await client.query(
        `UPDATE work_orders
         SET qty_good = qty_good - 1, qty_defect = qty_defect + 1
         WHERE id = $1 RETURNING *`,
        [woId]
      );
      let wo = woRows[0];

      // ถ้า WO เคยปิดงานไปแล้ว เปิดกลับให้ผลิตชดเชยได้
      if (wo.status === "COMPLETED") {
        const { rows: reopened } = await client.query(
          `UPDATE work_orders SET status = 'IN_PROGRESS', actual_end = NULL WHERE id = $1 RETURNING *`,
          [woId]
        );
        wo = reopened[0];
      }

      return { unit: updatedUnit[0], workOrder: wo };
    });

    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "ตีกลับชิ้นงานไม่สำเร็จ" });
  }
});

export default router;