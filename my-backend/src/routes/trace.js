import { Router } from "express";
import { query } from "../db/pool.js";
import { authRequired } from "../middleware.js";

const router = Router();
router.use(authRequired);

// GET /api/trace/search?q=xxx — ค้นหารวม ทั้ง serial และ lot พร้อมกัน (พิมพ์บางส่วนได้)
// ไม่ต้องรู้เลขเต็ม ไม่ต้องเลือกโหมดก่อน — ระบบหาให้ทั้งสองแบบแล้วส่งรายการมาให้เลือก
router.get("/search", async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  if (!q) return res.json({ units: [], lots: [] });

  const like = `%${q}%`;
  const [units, lots] = await Promise.all([
    query(
      `SELECT pu.serial_no, pu.result, pu.produced_at, p.name AS product_name, wo.wo_no
       FROM production_units pu
       JOIN work_orders wo ON wo.id = pu.work_order_id
       JOIN products p ON p.id = wo.product_id
       WHERE pu.serial_no ILIKE $1
       ORDER BY pu.produced_at DESC
       LIMIT 8`,
      [like]
    ),
    query(
      `SELECT ml.lot_no, ml.supplier, ml.qty_remaining, m.name AS material_name,
              (SELECT COUNT(*)::int FROM unit_material_usage umu WHERE umu.material_lot_id = ml.id) AS usage_count
       FROM material_lots ml
       JOIN materials m ON m.id = ml.material_id
       WHERE ml.lot_no ILIKE $1 OR m.name ILIKE $1
       ORDER BY ml.received_at DESC
       LIMIT 8`,
      [like]
    ),
  ]);

  res.json({ units: units.rows, lots: lots.rows });
});

// GET /api/trace/recent — รายการล่าสุดให้กดได้เลยโดยไม่ต้องพิมพ์
// ชิ้นงานที่ผลิตล่าสุด + ล็อตที่มีการใช้งานล่าสุด
router.get("/recent", async (_req, res) => {
  const [units, lots] = await Promise.all([
    query(
      `SELECT pu.serial_no, pu.result, pu.produced_at, p.name AS product_name, wo.wo_no
       FROM production_units pu
       JOIN work_orders wo ON wo.id = pu.work_order_id
       JOIN products p ON p.id = wo.product_id
       ORDER BY pu.produced_at DESC
       LIMIT 6`
    ),
    query(
      `SELECT ml.lot_no, ml.supplier, ml.qty_remaining, m.name AS material_name,
              (SELECT COUNT(*)::int FROM unit_material_usage umu WHERE umu.material_lot_id = ml.id) AS usage_count
       FROM material_lots ml
       JOIN materials m ON m.id = ml.material_id
       ORDER BY ml.received_at DESC
       LIMIT 6`
    ),
  ]);

  res.json({ units: units.rows, lots: lots.rows });
});

// GET /api/trace/unit/:serial — FORWARD TRACE
// ชิ้นงาน 1 ตัว: ผลิตเมื่อไหร่ เครื่องไหน ใครทำ ใช้วัตถุดิบล็อตไหนบ้าง
router.get("/unit/:serial", async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM v_unit_traceability WHERE serial_no = $1`,
    [req.params.serial]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "ไม่พบ serial นี้" });
  }

  const head = rows[0];
  const materials = rows
    .filter((r) => r.material_lot)
    .map((r) => ({
      materialCode: r.material_code,
      materialName: r.material_name,
      lot: r.material_lot,
      supplier: r.supplier,
      qtyUsed: r.qty_used,
    }));

  res.json({
    serialNo: head.serial_no,
    product: { code: head.product_code, name: head.product_name },
    workOrder: head.wo_no,
    machine: { code: head.machine_code, name: head.machine_name },
    operator: head.operator,
    producedAt: head.produced_at,
    result: head.result,
    materials,
  });
});

// GET /api/trace/lot/:lotNo — BACKWARD TRACE (Recall)
// ล็อตวัตถุดิบนี้มีปัญหา -> ชิ้นงาน/ใบสั่งผลิตไหนได้รับผลกระทบบ้าง
router.get("/lot/:lotNo", async (req, res) => {
  const { rows } = await query(
    `SELECT DISTINCT pu.serial_no, wo.wo_no, p.name AS product_name,
            pu.produced_at, pu.result
     FROM unit_material_usage umu
     JOIN material_lots ml ON ml.id = umu.material_lot_id
     JOIN production_units pu ON pu.id = umu.production_unit_id
     JOIN work_orders wo ON wo.id = pu.work_order_id
     JOIN products p ON p.id = wo.product_id
     WHERE ml.lot_no = $1
     ORDER BY pu.produced_at DESC`,
    [req.params.lotNo]
  );

  res.json({
    lot: req.params.lotNo,
    affectedCount: rows.length,
    units: rows.map((r) => ({
      serialNo: r.serial_no,
      workOrder: r.wo_no,
      product: r.product_name,
      producedAt: r.produced_at,
      result: r.result,
    })),
  });
});

export default router;