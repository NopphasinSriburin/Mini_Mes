import { Router } from "express";
import { query, withTransaction } from "../db/pool.js";
import { authRequired, requireRole } from "../middleware.js";

const router = Router();
router.use(authRequired);

// GET /api/products — รายการสินค้าทั้งหมด (ใช้ตอนสร้าง WO)
router.get("/", async (_req, res) => {
  const { rows } = await query(
    `SELECT id, product_code, name, unit FROM products ORDER BY product_code`
  );
  res.json(rows);
});

// GET /api/products/:id/bom — สูตรวัตถุดิบของสินค้านี้
router.get("/:id/bom", async (req, res) => {
  const { rows } = await query(
    `SELECT b.id, b.material_id, b.qty_per_unit,
            m.material_code, m.name AS material_name, m.unit
     FROM bom_items b
     JOIN materials m ON m.id = b.material_id
     WHERE b.product_id = $1
     ORDER BY m.material_code`,
    [req.params.id]
  );
  res.json(rows);
});

// PUT /api/products/:id/bom — ตั้งสูตรวัตถุดิบใหม่ทั้งหมด (แทนของเดิม)
// body: { items: [{ materialId, qtyPerUnit }] }
// เฉพาะ ENGINEER/ADMIN เท่านั้นที่แก้สูตรได้
router.put("/:id/bom", requireRole("ENGINEER", "ADMIN"), async (req, res) => {
  const productId = req.params.id;
  const { items = [] } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "items ต้องเป็น array" });
  }

  try {
    const result = await withTransaction(async (client) => {
      // ลบสูตรเดิมทั้งหมดของสินค้านี้ก่อน
      await client.query(`DELETE FROM bom_items WHERE product_id = $1`, [productId]);

      // ใส่สูตรใหม่
      for (const item of items) {
        if (!item.materialId || !item.qtyPerUnit) continue;
        await client.query(
          `INSERT INTO bom_items (product_id, material_id, qty_per_unit)
           VALUES ($1, $2, $3)`,
          [productId, item.materialId, item.qtyPerUnit]
        );
      }

      const { rows } = await client.query(
        `SELECT b.id, b.material_id, b.qty_per_unit,
                m.material_code, m.name AS material_name, m.unit
         FROM bom_items b JOIN materials m ON m.id = b.material_id
         WHERE b.product_id = $1 ORDER BY m.material_code`,
        [productId]
      );
      return rows;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "บันทึกสูตรวัตถุดิบไม่สำเร็จ" });
  }
});

export default router;