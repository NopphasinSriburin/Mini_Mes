import { useEffect, useState } from "react";
import { api } from "../api";
import type { Product, Material, BomItem } from "../types";

interface Row {
  materialId: string;
  qtyPerUnit: string;
}

export default function BomSettings() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.getProducts(), api.getMaterials()])
      .then(([p, m]) => {
        setProducts(p);
        setMaterials(m);
        if (p[0]) selectProduct(p[0]);
      })
      .catch((e) => setError(e.message));
  }, []);

  const selectProduct = async (p: Product) => {
    setSelectedProduct(p);
    setStatus("");
    try {
      const bom = await api.getBom(p.id);
      setRows(bom.map((b: BomItem) => ({ materialId: b.material_id, qtyPerUnit: b.qty_per_unit })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดสูตรไม่สำเร็จ");
    }
  };

  const addRow = () => {
    if (!materials || materials.length === 0) return;
    setRows((r) => [...r, { materialId: materials[0].id, qtyPerUnit: "" }]);
  };

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  };

  const removeRow = (i: number) => {
    setRows((r) => r.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const items = rows
        .filter((r) => r.materialId && Number(r.qtyPerUnit) > 0)
        .map((r) => ({ materialId: r.materialId, qtyPerUnit: Number(r.qtyPerUnit) }));
      await api.setBom(selectedProduct.id, items);
      setStatus("บันทึกสูตรเรียบร้อย");
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ — อาจไม่มีสิทธิ์แก้สูตร (ต้องเป็น Engineer/Admin)");
    } finally {
      setSaving(false);
    }
  };

  if (error && !products) return <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-4">{error}</div>;
  if (!products || !materials) return <div className="text-slate-500 text-sm py-12 text-center">กำลังโหลด...</div>;

  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">ตั้งค่าสูตรวัตถุดิบ (BOM)</h2>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {products.map((p) => (
          <button key={p.id} onClick={() => selectProduct(p)}
            className={`px-3.5 py-2 rounded-lg text-sm whitespace-nowrap border transition-colors ${
              selectedProduct?.id === p.id ? "text-sky-400 bg-sky-400/10 border-sky-400/40" : "text-slate-400 border-slate-700 hover:border-slate-600"
            }`}>
            {p.name}
          </button>
        ))}
      </div>

      {selectedProduct && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="text-sm text-slate-400 mb-4">
            สูตรสำหรับผลิต <span className="text-slate-200 font-semibold">{selectedProduct.name}</span> จำนวน 1 {selectedProduct.unit}
          </div>

          <div className="space-y-2 mb-1">
            <div className="grid grid-cols-[1fr_auto] gap-2 text-[11px] text-slate-500 px-1">
              <span>วัตถุดิบ</span>
              <span className="w-32 text-center">ปริมาณที่ใช้ต่อสินค้า 1 ชิ้น</span>
            </div>
            {rows.map((row, i) => {
              const unit = materials.find((m) => m.id === row.materialId)?.unit || "";
              return (
                <div key={i} className="flex gap-2 items-center">
                  <select value={row.materialId} onChange={(e) => updateRow(i, { materialId: e.target.value })}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500">
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>{m.material_code} · {m.name}</option>
                    ))}
                  </select>
                  <div className="relative w-32">
                    <input value={row.qtyPerUnit} onChange={(e) => updateRow(i, { qtyPerUnit: e.target.value })}
                      type="number" step="0.001" placeholder="เช่น 0.05"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-sm text-slate-100 font-mono outline-none focus:border-sky-500" />
                    {unit && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 pointer-events-none">{unit}</span>
                    )}
                  </div>
                  <button onClick={() => removeRow(i)}
                    className="text-slate-500 hover:text-red-400 px-2 text-sm transition-colors">✕</button>
                </div>
              );
            })}
            {rows.length === 0 && <div className="text-slate-500 text-sm py-3 text-center">ยังไม่มีวัตถุดิบในสูตร</div>}
          </div>
          <p className="text-[11px] text-slate-500 mb-4">
            ตัวอย่าง: ถ้าผลิตสินค้า 1 ชิ้นต้องใช้แผ่นทองแดง 0.05 กก. ให้ใส่ <span className="font-mono text-slate-400">0.05</span> ในช่องของแผ่นทองแดง
          </p>

          <div className="flex gap-2">
            <button onClick={addRow}
              className="text-sky-400 border border-sky-400/40 hover:bg-sky-400/10 rounded-lg px-3.5 py-2 text-sm transition-colors">
              + เพิ่มวัตถุดิบ
            </button>
            <button onClick={save} disabled={saving}
              className="ml-auto bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg px-5 py-2 text-sm transition-colors">
              {saving ? "กำลังบันทึก..." : "บันทึกสูตร"}
            </button>
          </div>

          {status && <div className="mt-3 text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 rounded-lg px-3 py-2">{status}</div>}
          {error && <div className="mt-3 text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2">{error}</div>}
        </div>
      )}
    </div>
  );
}