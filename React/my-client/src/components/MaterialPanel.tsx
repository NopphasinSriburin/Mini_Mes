import { useEffect, useState } from "react";
import { api } from "../api";
import type { BomItem, MaterialLot, ReservedMaterial } from "../types";

export default function MaterialPanel({ workOrderId, productId }: { workOrderId: string; productId: string }) {
  const [reserved, setReserved] = useState<ReservedMaterial[] | null>(null);
  const [bom, setBom] = useState<BomItem[] | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [lots, setLots] = useState<MaterialLot[]>([]);
  const [selectedLot, setSelectedLot] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = () => {
    Promise.all([api.getWorkOrderDetail(workOrderId), api.getBom(productId)])
      .then(([detail, b]) => {
        setReserved(detail.reservedMaterials);
        setBom(b);
        if (b[0]) setSelectedMaterial(b[0].material_id);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, [workOrderId, productId]);

  useEffect(() => {
    if (!selectedMaterial) return;
    api.getMaterialLots(selectedMaterial).then((l) => {
      const usable = l.filter((x) => Number(x.qty_remaining) > 0);
      setLots(usable);
      setSelectedLot(usable[0]?.id || "");
    });
  }, [selectedMaterial]);

  const addLot = async () => {
    if (!selectedLot) return;
    setAdding(true);
    setError("");
    setStatus("");
    try {
      await api.addWorkOrderMaterial(workOrderId, selectedLot);
      setStatus("เพิ่มล็อตวัตถุดิบเรียบร้อย");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เพิ่มล็อตไม่สำเร็จ — ต้องเป็น Engineer/Admin");
    } finally {
      setAdding(false);
    }
  };

  const removeLot = async (lotId: string) => {
    if (!window.confirm("เอาล็อตนี้ออกจาก WO นี้? (ประวัติการใช้ที่บันทึกไปแล้วจะไม่หาย)")) return;
    setRemovingId(lotId);
    setError("");
    setStatus("");
    try {
      await api.removeWorkOrderMaterial(workOrderId, lotId);
      setStatus("เอาล็อตออกเรียบร้อย");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เอาล็อตออกไม่สำเร็จ — ต้องเป็น Engineer/Admin");
    } finally {
      setRemovingId(null);
    }
  };

  if (!reserved || !bom) return <div className="text-xs text-slate-500 py-2">กำลังโหลดข้อมูลวัตถุดิบ...</div>;

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 mt-3">
      <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">ล็อตวัตถุดิบที่ผูกไว้กับ WO นี้</div>

      {reserved.length === 0 && (
        <div className="text-amber-400 text-xs bg-amber-400/10 border border-amber-400/30 rounded px-2.5 py-1.5 mb-3">
          ยังไม่มีล็อตวัตถุดิบผูกไว้ — ถ้าสินค้านี้มีสูตร BOM จะตัดสต็อกไม่ได้จนกว่าจะเพิ่มล็อต
        </div>
      )}

      <div className="space-y-1.5 mb-3">
        {reserved.map((r) => (
          <div key={r.material_lot_id} className="flex items-center justify-between text-xs bg-slate-900 rounded px-2.5 py-1.5">
            <span className="text-slate-300">{r.material_name} <span className="text-slate-500 font-mono">({r.material_code})</span></span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-400">{r.lot_no} · เหลือ {r.qty_remaining}</span>
              <button onClick={() => removeLot(r.material_lot_id)} disabled={removingId === r.material_lot_id}
                className="text-slate-500 hover:text-red-400 disabled:opacity-50 transition-colors" title="เอาล็อตนี้ออกจาก WO">
                {removingId === r.material_lot_id ? "..." : "✕"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {bom.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <select value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500">
            {bom.map((b) => <option key={b.material_id} value={b.material_id}>{b.material_name}</option>)}
          </select>
          <select value={selectedLot} onChange={(e) => setSelectedLot(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 outline-none focus:border-sky-500 flex-1 min-w-[140px]">
            {lots.length === 0 && <option value="">ไม่มีล็อตที่มีสต็อก</option>}
            {lots.map((l) => (
              <option key={l.id} value={l.id}>{l.lot_no} · เหลือ {l.qty_remaining} {l.unit}</option>
            ))}
          </select>
          <button onClick={addLot} disabled={adding || !selectedLot}
            className="text-xs bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold px-3 py-1.5 rounded-lg transition-colors">
            {adding ? "..." : "+ เพิ่มล็อต"}
          </button>
        </div>
      )}

      {status && <div className="mt-2 text-xs text-emerald-400">{status}</div>}
      {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
    </div>
  );
}