import { useEffect, useState } from "react";
import { api } from "../api";
import type { Product, BomItem, MaterialLot } from "../types";

interface MaterialSelection {
  materialId: string;
  materialName: string;
  materialCode: string;
  qtyPerUnit: number;
  qtyNeeded: number;         // qtyPerUnit * qtyTarget
  lots: MaterialLot[];
  selectedLotId: string;
}

export default function CreateWorkOrder({ onCreated }: { onCreated?: () => void }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productId, setProductId] = useState("");
  const [woNo, setWoNo] = useState("");
  const [qtyTarget, setQtyTarget] = useState("100");
  const [selections, setSelections] = useState<MaterialSelection[]>([]);
  const [loadingBom, setLoadingBom] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getProducts().then((list) => {
      setProducts(list);
      if (list[0]) setProductId(list[0].id);
    }).catch((e) => setError(e.message));
  }, []);

  // สุ่มเลขที่ WO ตั้งต้นให้ (แก้ไขได้)
  useEffect(() => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const seq = String(Math.floor(Math.random() * 900) + 100);
    setWoNo(`WO-${yy}${mm}-${seq}`);
  }, []);

  // โหลด BOM ของสินค้าที่เลือก + คำนวณจำนวนที่ต้องใช้ + โหลดล็อตที่มีของแต่ละวัตถุดิบ
  useEffect(() => {
    if (!productId) return;
    setLoadingBom(true);
    setError("");
    setSelections([]);
    api.getBom(productId).then(async (bom: BomItem[]) => {
      if (bom.length === 0) {
        setLoadingBom(false);
        return;
      }
      const target = Number(qtyTarget) || 0;
      const sels = await Promise.all(
        bom.map(async (item): Promise<MaterialSelection> => {
          const lots = await api.getMaterialLots(item.material_id);
          const usableLots = lots.filter((l) => Number(l.qty_remaining) > 0);
          return {
            materialId: item.material_id,
            materialName: item.material_name,
            materialCode: item.material_code,
            qtyPerUnit: Number(item.qty_per_unit),
            qtyNeeded: Number(item.qty_per_unit) * target,
            lots: usableLots,
            selectedLotId: usableLots[0]?.id || "",
          };
        })
      );
      setSelections(sels);
      setLoadingBom(false);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : "โหลดสูตรวัตถุดิบไม่สำเร็จ");
      setLoadingBom(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // อัปเดตยอดที่ต้องใช้เมื่อเปลี่ยนจำนวนเป้าหมาย (ไม่ต้องโหลดล็อตใหม่)
  useEffect(() => {
    const target = Number(qtyTarget) || 0;
    setSelections((prev) => prev.map((s) => ({ ...s, qtyNeeded: s.qtyPerUnit * target })));
  }, [qtyTarget]);

  const setLotFor = (materialId: string, lotId: string) => {
    setSelections((prev) => prev.map((s) => (s.materialId === materialId ? { ...s, selectedLotId: lotId } : s)));
  };

  const submit = async () => {
    setError("");
    setStatus("");
    if (!woNo || !productId || !qtyTarget) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    const missing = selections.find((s) => !s.selectedLotId);
    if (missing) {
      setError(`กรุณาเลือกล็อตวัตถุดิบสำหรับ ${missing.materialName}`);
      return;
    }

    setSubmitting(true);
    try {
      await api.createWorkOrder({
        woNo,
        productId,
        qtyTarget: Number(qtyTarget),
        materials: selections.map((s) => ({ lotId: s.selectedLotId, qtyReserved: s.qtyNeeded })),
      });
      setStatus(`สร้างใบสั่งผลิต ${woNo} เรียบร้อย — ไปที่หน้า "การผลิต" เพื่อกด "เริ่มผลิต"`);
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "สร้างใบสั่งผลิตไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !products) return <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-4">{error}</div>;
  if (!products) return <div className="text-slate-500 text-sm py-12 text-center">กำลังโหลด...</div>;

  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">สร้างใบสั่งผลิตใหม่</h2>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">เลขที่ใบสั่งผลิต</label>
            <input value={woNo} onChange={(e) => setWoNo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">สินค้า</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500">
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">จำนวนเป้าหมาย</label>
            <input type="number" value={qtyTarget} onChange={(e) => setQtyTarget(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 outline-none focus:border-sky-500" />
          </div>
        </div>

        {loadingBom && <div className="text-slate-500 text-sm py-4 text-center">กำลังคำนวณวัตถุดิบที่ต้องใช้...</div>}

        {!loadingBom && selections.length === 0 && (
          <div className="text-amber-400 text-sm bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-2.5">
            สินค้านี้ยังไม่มีสูตรวัตถุดิบ (BOM) — ไปตั้งค่าที่แท็บ "ตั้งค่าสูตร" ก่อน หรือสร้าง WO ต่อได้โดยไม่ผูกวัตถุดิบ
          </div>
        )}

        {selections.length > 0 && (
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">วัตถุดิบที่ต้องใช้ (คำนวณจากสูตร)</div>
            <div className="space-y-2">
              {selections.map((s) => (
                <div key={s.materialId} className="bg-slate-800/40 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-200">
                      {s.materialName} <span className="text-slate-500 font-mono text-xs">({s.materialCode})</span>
                    </span>
                    <span className="font-mono text-sm text-sky-400">ต้องใช้ {s.qtyNeeded.toFixed(3)}</span>
                  </div>

                  {s.lots.length === 0 ? (
                    <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/30 rounded px-2.5 py-1.5">
                      ไม่มีล็อตที่มีสต็อกคงเหลือ — ต้องรับวัตถุดิบเข้าก่อน
                    </div>
                  ) : (
                    <select value={s.selectedLotId} onChange={(e) => setLotFor(s.materialId, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 outline-none focus:border-sky-500">
                      {s.lots.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.lot_no} · {l.supplier} · คงเหลือ {l.qty_remaining} {l.unit}
                          {Number(l.qty_remaining) < s.qtyNeeded ? " ⚠ ไม่พอ" : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <div className="mb-3 text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2.5">{error}</div>}
      {status && <div className="mb-3 text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 rounded-lg px-3 py-2.5">{status}</div>}

      <button onClick={submit} disabled={submitting}
        className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg py-3 text-sm transition-colors">
        {submitting ? "กำลังสร้าง..." : "สร้างใบสั่งผลิต"}
      </button>
    </div>
  );
}