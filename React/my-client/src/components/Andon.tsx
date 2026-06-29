import { useEffect, useState } from "react";
import { api } from "../api";
import type { WorkOrder, QualityResult } from "../types";
import Badge from "./Badge";

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

  // โหลดเฉพาะใบสั่งผลิตที่กำลังผลิตอยู่
  const loadOrders = () =>
    api.getWorkOrders("IN_PROGRESS").then((list) => {
      setOrders(list);
      // ถ้ามีตัวที่เลือกอยู่ อัปเดตยอดให้ตรง
      setSelected((cur) => (cur ? list.find((o) => o.id === cur.id) ?? cur : list[0] ?? null));
    }).catch((e) => setError(e.message));

  useEffect(() => { loadOrders(); }, []);

  // สร้าง serial อัตโนมัติจากเลข WO + เวลา (พนักงานไม่ต้องพิมพ์)
  const nextSerial = (wo: WorkOrder) => {
    const seq = (wo.qty_good + wo.qty_defect + 1).toString().padStart(4, "0");
    return `${wo.wo_no}-${seq}`;
  };

  const record = async (result: QualityResult) => {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    const serial = nextSerial(selected);
    try {
      await api.recordUnit(selected.id, { serialNo: serial, result });
      setRecent((r) => [{ serial, result, time: new Date().toLocaleTimeString("th-TH") }, ...r].slice(0, 8));
      await loadOrders(); // ดึงยอดใหม่
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  if (error && !orders) return <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-4">{error}</div>;
  if (!orders) return <div className="text-slate-500 text-sm py-12 text-center">กำลังโหลด...</div>;

  if (orders.length === 0) {
    return (
      <div className="text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
        ไม่มีใบสั่งผลิตที่กำลังดำเนินการ — เปลี่ยนสถานะ WO เป็น IN_PROGRESS ก่อนจึงจะบันทึกได้
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">บันทึกการผลิต (Andon)</h2>

      {/* เลือกใบสั่งผลิต */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {orders.map((o) => (
          <button key={o.id} onClick={() => setSelected(o)}
            className={`px-4 py-2.5 rounded-lg text-sm font-mono whitespace-nowrap border transition-colors ${
              selected?.id === o.id
                ? "text-sky-400 bg-sky-400/10 border-sky-400/40"
                : "text-slate-400 border-slate-700 hover:border-slate-600"
            }`}>
            {o.wo_no}
          </button>
        ))}
      </div>

      {selected && (
        <>
          {/* สรุปยอดของใบที่เลือก */}
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
              <div className="h-full bg-sky-500 transition-all"
                style={{ width: `${Math.min(100, Math.round(((selected.qty_good + selected.qty_defect) / selected.qty_target) * 100))}%` }} />
            </div>
            <div className="text-xs text-slate-500 mt-1.5 font-mono">
              ชิ้นถัดไป: {nextSerial(selected)}
            </div>
          </div>

          {error && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-3 mb-4">{error}</div>}

          {/* ปุ่มใหญ่ — กดง่ายบน tablet หน้างาน */}
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

          {/* รายการที่เพิ่งบันทึก */}
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