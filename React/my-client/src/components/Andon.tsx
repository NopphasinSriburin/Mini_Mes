import { useEffect, useState } from "react";
import { api } from "../api";
import type { WorkOrder, QualityResult } from "../types";
import Badge from "./Badge";
import MaterialPanel from "./materialpanel";

interface RecentRecord {
  serial: string;
  result: QualityResult;
  time: string;
}

export default function Andon() {
  const [orders, setOrders] = useState<WorkOrder[] | null>(null);
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [recent, setRecent] = useState<RecentRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stopping, setStopping] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);

  const loadOrders = () =>
    api.getWorkOrders("IN_PROGRESS").then((list) => {
      setOrders(list);
      setSelected((cur) => (cur ? list.find((o) => o.id === cur.id) ?? null : list[0] ?? null));
    }).catch((e) => setError(e.message));

  useEffect(() => { loadOrders(); }, []);

  const nextSerial = (wo: WorkOrder) => {
    const seq = (wo.qty_good + wo.qty_defect + 1).toString().padStart(4, "0");
    return `${wo.wo_no}-${seq}`;
  };

  // เป้าหมายนับเฉพาะของดี — ของเสียไม่นับ ไม่ทำให้หยุด
  const reachedTarget = (wo: WorkOrder) => wo.qty_good >= wo.qty_target;

  const record = async (result: QualityResult) => {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    const serial = nextSerial(selected);
    try {
      await api.recordUnit(selected.id, { serialNo: serial, result });
      setRecent((r) => [{ serial, result, time: new Date().toLocaleTimeString("th-TH") }, ...r].slice(0, 8));
      await loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const stopProduction = async () => {
    if (!selected) return;
    const ok = window.confirm(
      `ยืนยันหยุดการผลิต ${selected.wo_no}?\n\nของดี ${selected.qty_good}/${selected.qty_target} — หลังหยุดแล้วจะย้ายไปหน้าประวัติการผลิต และบันทึกเพิ่มไม่ได้จนกว่าจะเปิดใหม่ผ่านหน้า QC`
    );
    if (!ok) return;
    setStopping(true);
    setError("");
    try {
      await api.setWorkOrderStatus(selected.id, "COMPLETED");
      await loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : "หยุดการผลิตไม่สำเร็จ");
    } finally {
      setStopping(false);
    }
  };

  if (error && !orders) return <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-4">{error}</div>;
  if (!orders) return <div className="text-slate-500 text-sm py-12 text-center">กำลังโหลด...</div>;

  if (orders.length === 0) {
    return (
      <div className="text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
        ไม่มีใบสั่งผลิตที่กำลังดำเนินการ — ไปที่แท็บ "สร้าง WO" แล้วกด "เริ่มผลิต" ที่หน้าการผลิตก่อน
      </div>
    );
  }

  const done = selected ? reachedTarget(selected) : false;

  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">บันทึกการผลิต (Andon)</h2>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {orders.map((o) => (
          <button key={o.id} onClick={() => { setSelected(o); setShowMaterials(false); }}
            className={`px-4 py-2.5 rounded-lg text-sm font-mono whitespace-nowrap border transition-colors ${
              selected?.id === o.id ? "text-sky-400 bg-sky-400/10 border-sky-400/40" : "text-slate-400 border-slate-700 hover:border-slate-600"
            }`}>
            {o.wo_no}
          </button>
        ))}
      </div>

      {selected && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-lg font-bold text-slate-100">{selected.wo_no}</span>
              <Badge value={selected.status} />
            </div>
            <div className="text-sm text-slate-400 mb-4">{selected.product_name}</div>

            <div className="grid grid-cols-3 gap-3 mb-2">
              <Stat label="เป้าหมาย" value={selected.qty_target} />
              <Stat label="ของดี" value={selected.qty_good} accent="text-emerald-400" />
              <Stat label="ของเสีย" value={selected.qty_defect} accent={selected.qty_defect ? "text-red-400" : "text-slate-300"} />
            </div>

            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mt-3">
              <div className={`h-full transition-all ${done ? "bg-emerald-500" : "bg-sky-500"}`}
                style={{ width: `${Math.min(100, Math.round((selected.qty_good / selected.qty_target) * 100))}%` }} />
            </div>
            <div className="text-xs text-slate-500 mt-1.5 font-mono">
              ชิ้นถัดไป: {nextSerial(selected)}
            </div>

            <button onClick={() => setShowMaterials((s) => !s)}
              className="mt-3 text-xs text-sky-400 hover:text-sky-300 transition-colors">
              {showMaterials ? "▲ ซ่อนวัตถุดิบ" : "▼ จัดการวัตถุดิบ"}
            </button>
            {showMaterials && <MaterialPanel workOrderId={selected.id} productId={selected.product_id} />}

            {done && (
              <div className="mt-4 flex items-center justify-between bg-emerald-400/10 border border-emerald-400/30 rounded-lg px-3.5 py-2.5">
                <span className="text-sm text-emerald-400 font-semibold">✓ ครบเป้าหมายแล้ว</span>
                <button onClick={stopProduction} disabled={stopping}
                  className="bg-red-500 hover:bg-red-400 disabled:opacity-50 text-slate-950 font-semibold text-xs px-4 py-2 rounded-lg transition-colors">
                  {stopping ? "กำลังหยุด..." : "🛑 หยุดการผลิต"}
                </button>
              </div>
            )}
          </div>

          {error && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-3 mb-4">{error}</div>}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => record("PASS")} disabled={busy}
              className="bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-bold text-lg rounded-xl py-8 transition-all">
              ✓ ของดี
              <div className="text-xs font-normal opacity-80 mt-1">PASS</div>
            </button>
            <button onClick={() => record("FAIL")} disabled={busy}
              className="bg-red-500 hover:bg-red-400 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-bold text-lg rounded-xl py-8 transition-all">
              ✕ ของเสีย
              <div className="text-xs font-normal opacity-80 mt-1">FAIL</div>
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center -mt-4 mb-6">
            ปุ่มของเสียกดได้เสมอ ไม่นับเข้าเป้าหมาย — เป้าหมายนับเฉพาะของดี
          </p>

          {recent.length > 0 && (
            <>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">บันทึกล่าสุด</h3>
              <div className="space-y-1.5">
                {recent.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
                    <span className="font-mono text-sm text-slate-300">{r.serial}</span>
                    <div className="flex items-center gap-3">
                      <Badge value={r.result} />
                      <span className="text-xs text-slate-500 font-mono">{r.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent = "text-slate-100" }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-slate-800/40 rounded-lg p-3 text-center">
      <div className="text-[11px] text-slate-500 mb-1">{label}</div>
      <div className={`font-mono text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}