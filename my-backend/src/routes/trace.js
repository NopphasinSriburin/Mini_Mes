import { Router } from "express";
import { query } from "../db/pool.js";
import { authRequired } from "../middleware.js";

const router = Router();
router.use(authRequired);

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