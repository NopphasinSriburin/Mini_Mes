import { useEffect, useState } from "react";
import { api } from "../api";
import type { Material, MaterialLot } from "../types";

export default function ReceiveMaterial() {
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [materialId, setMaterialId] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [qty, setQty] = useState("");
  const [recentLots, setRecentLots] = useState<MaterialLot[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getMaterials().then((list) => {
      setMaterials(list);
      if (list[0]) setMaterialId(list[0].id);
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!materialId) return;
    api.getMaterialLots(materialId).then(setRecentLots).catch(() => {});
  }, [materialId]);

  const submit = async () => {
    setError("");
    setStatus("");
    if (!materialId || !lotNo.trim() || !qty) {
      setError("กรุณากรอกวัตถุดิบ เลขที่ล็อต และจำนวนให้ครบ");
      return;
    }
    const qtyNum = Number(qty);
    if (!(qtyNum > 0)) {
      setError("จำนวนต้องมากกว่า 0");
      return;
    }

    setSubmitting(true);
    try {
      const lot = await api.createMaterialLot({
        materialId,
        lotNo: lotNo.trim(),
        supplier: supplier.trim() || undefined,
        qtyReceived: qtyNum,
      });
      setStatus(`รับวัตถุดิบเข้าคลังเรียบร้อย — ${lot.lot_no} จำนวน ${qtyNum}`);
      setLotNo("");
      setSupplier("");
      setQty("");
      const list = await api.getMaterialLots(materialId);
      setRecentLots(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "รับวัตถุดิบไม่สำเร็จ — ต้องเป็น Engineer/Admin");
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !materials) return <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-4">{error}</div>;
  if (!materials) return <div className="text-slate-500 text-sm py-12 text-center">กำลังโหลด...</div>;

  const selectedMaterial = materials.find((m) => m.id === materialId);

  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">รับวัตถุดิบเข้าคลัง</h2>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">วัตถุดิบ</label>
            <select value={materialId} onChange={(e) => setMaterialId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500">
              {materials.map((m) => <option key={m.id} value={m.id}>{m.material_code} · {m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">เลขที่ล็อต</label>
            <input value={lotNo} onChange={(e) => setLotNo(e.target.value)}
              placeholder="เช่น LOT-CU-2607"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">ซัพพลายเออร์ (ไม่บังคับ)</label>
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)}
              placeholder="เช่น Supplier A"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              จำนวนที่รับ {selectedMaterial ? `(${selectedMaterial.unit})` : ""}
            </label>
            <input type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)}
              placeholder="เช่น 500"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 outline-none focus:border-sky-500" />
          </div>
        </div>

        {error && <div className="mb-3 text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2.5">{error}</div>}
        {status && <div className="mb-3 text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 rounded-lg px-3 py-2.5">{status}</div>}

        <button onClick={submit} disabled={submitting}
          className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg py-2.5 text-sm transition-colors">
          {submitting ? "กำลังบันทึก..." : "รับเข้าคลัง"}
        </button>
      </div>

      {recentLots.length > 0 && (
        <>
          <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">
            ล็อตที่มีอยู่ของ {selectedMaterial?.name}
          </div>
          <div className="space-y-1.5">
            {recentLots.map((l) => (
              <div key={l.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm">
                <span className="font-mono text-slate-300">{l.lot_no}</span>
                <span className="text-slate-500 text-xs">{l.supplier}</span>
                <span className="font-mono text-slate-400">
                  เหลือ {l.qty_remaining} / {l.qty_received} {l.unit}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}