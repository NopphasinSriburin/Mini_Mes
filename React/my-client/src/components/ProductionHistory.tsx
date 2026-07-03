import { useEffect, useState } from "react";
import { api } from "../api";
import type { WorkOrder } from "../types";
import Badge from "./Badge";

export default function ProductionHistory() {
  const [orders, setOrders] = useState<WorkOrder[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getWorkOrders("COMPLETED").then(setOrders).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-4">{error}</div>;
  if (!orders) return <div className="text-slate-500 text-sm py-12 text-center">กำลังโหลด...</div>;

  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">ประวัติการผลิต</h2>

      {orders.length === 0 && (
        <div className="text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
          ยังไม่มีใบสั่งผลิตที่ปิดงานแล้ว
        </div>
      )}

      <div className="space-y-2">
        {orders.map((w) => {
          const yieldPct = w.qty_good + w.qty_defect > 0
            ? Math.round((w.qty_good / (w.qty_good + w.qty_defect)) * 1000) / 10
            : null;
          return (
            <div key={w.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-slate-100">{w.wo_no}</span>
                <Badge value={w.status} />
              </div>
              <div className="text-sm text-slate-400 mb-3">{w.product_name}</div>
              <div className="grid grid-cols-4 gap-3 text-center">
                <MiniStat label="เป้าหมาย" value={w.qty_target} />
                <MiniStat label="ของดี" value={w.qty_good} accent="text-emerald-400" />
                <MiniStat label="ของเสีย" value={w.qty_defect} accent={w.qty_defect ? "text-red-400" : "text-slate-400"} />
                <MiniStat label="Yield" value={yieldPct != null ? `${yieldPct}%` : "—"} accent="text-sky-400" />
              </div>
              {w.actual_start && w.actual_end && (
                <div className="text-[11px] text-slate-500 font-mono mt-3">
                  {new Date(w.actual_start).toLocaleString("th-TH")} → {new Date(w.actual_end).toLocaleString("th-TH")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent = "text-slate-100" }: { label: string; value: number | string; accent?: string }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 mb-1">{label}</div>
      <div className={`font-mono text-lg font-bold ${accent}`}>{value}</div>
    </div>
  );
}