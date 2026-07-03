import { Router } from "express";
import { query } from "../db/pool.js";
import { authRequired, requireRole } from "../middleware.js";

const router = Router();
router.use(authRequired);

// GET /api/materials — รายการวัตถุดิบทั้งหมด (ใช้ตอนตั้งสูตร BOM)
router.get("/", async (_req, res) => {
  const { rows } = await query(
    `SELECT id, material_code, name, unit FROM materials ORDER BY material_code`
  );
  res.json(rows);
});

// GET /api/materials/lots — ล็อตวัตถุดิบทั้งหมดพร้อมสต็อกคงเหลือ
// กรอง ?materialId= ได้ เพื่อดูเฉพาะล็อตของวัตถุดิบตัวนั้น (ใช้ตอนสร้าง WO เลือกล็อต)
router.get("/lots", async (req, res) => {
  const { materialId } = req.query;
  const params = [];
  let sql = `
    SELECT ml.id, ml.lot_no, ml.supplier, ml.qty_received, ml.qty_remaining, ml.received_at,
           m.id AS material_id, m.material_code, m.name AS material_name, m.unit
    FROM material_lots ml
    JOIN materials m ON m.id = ml.material_id`;
  if (materialId) {
    params.push(materialId);
    sql += ` WHERE ml.material_id = $1`;
  }
  sql += ` ORDER BY ml.received_at ASC`; // เก่าสุดก่อน (FIFO)
  const { rows } = await query(sql, params);
  res.json(rows);
});

// GET /api/materials/:id/ledger — ประวัติความเคลื่อนไหวของวัตถุดิบ (รับเข้า + ใช้ไป) เรียงตามเวลา
router.get("/:id/ledger", async (req, res) => {
  const materialId = req.params.id;

  const { rows: materialRows } = await query(
    `SELECT id, material_code, name, unit FROM materials WHERE id = $1`,
    [materialId]
  );
  if (!materialRows[0]) return res.status(404).json({ error: "ไม่พบวัตถุดิบนี้" });

  const { rows: totalRows } = await query(
    `SELECT COALESCE(SUM(qty_remaining), 0) AS total_remaining FROM material_lots WHERE material_id = $1`,
    [materialId]
  );

  // รวม 2 แหล่ง: รับเข้า (IN จาก material_lots) และใช้ไป (OUT จาก unit_material_usage)
  const { rows: entries } = await query(
    `SELECT 'IN' AS type, ml.received_at AS ts, ml.lot_no, NULL AS serial_no, NULL AS wo_no,
            ml.qty_received AS qty, ml.supplier AS ref
     FROM material_lots ml
     WHERE ml.material_id = $1

     UNION ALL

     SELECT 'OUT' AS type, pu.produced_at AS ts, ml.lot_no, pu.serial_no, wo.wo_no,
            umu.qty_used AS qty, NULL AS ref
     FROM unit_material_usage umu
     JOIN material_lots ml ON ml.id = umu.material_lot_id
     JOIN production_units pu ON pu.id = umu.production_unit_id
     JOIN work_orders wo ON wo.id = pu.work_order_id
     WHERE ml.material_id = $1

     ORDER BY ts DESC`,
    [materialId]
  );

  res.json({
    material: materialRows[0],
    totalRemaining: totalRows[0].total_remaining,
    entries,
  });
});

// POST /api/materials/lots — รับวัตถุดิบเข้าคลัง (สร้างล็อตใหม่)
// body: { materialId, lotNo, supplier, qtyReceived }  —  เฉพาะ ENGINEER/ADMIN
router.post("/lots", requireRole("ENGINEER", "ADMIN"), async (req, res) => {
  const { materialId, lotNo, supplier, qtyReceived } = req.body;
  if (!materialId || !lotNo || !qtyReceived) {
    return res.status(400).json({ error: "กรุณากรอก materialId, lotNo, qtyReceived ให้ครบ" });
  }
  if (Number(qtyReceived) <= 0) {
    return res.status(400).json({ error: "จำนวนที่รับต้องมากกว่า 0" });
  }

  try {
    const { rows } = await query(
      `INSERT INTO material_lots (material_id, lot_no, supplier, qty_received, qty_remaining)
       VALUES ($1, $2, $3, $4, $4)
       RETURNING *`,
      [materialId, lotNo, supplier || null, qtyReceived]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "เลขที่ล็อตนี้ถูกใช้ไปแล้วสำหรับวัตถุดิบนี้" });
    }
    console.error(err);
    res.status(500).json({ error: "รับวัตถุดิบเข้าคลังไม่สำเร็จ" });
  }
});

export default router;