import { useEffect, useState } from "react";
import { api } from "../api";
import type { MaintenanceOrder } from "../types";
import Badge from "./Badge";

export default function Maintenance() {
  const [orders, setOrders] = useState<MaintenanceOrder[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getMaintenance().then(setOrders).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-4">{error}</div>;
  if (!orders) return <div className="text-slate-500 text-sm py-12 text-center">กำลังโหลด...</div>;

  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">ระบบซ่อมบำรุง (Maintenance)</h2>
      {orders.length === 0 && (
        <div className="text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
          ยังไม่มีใบแจ้งซ่อม
        </div>
      )}
      {orders.map((m) => (
        <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-2.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-mono font-bold text-slate-100">{m.mo_no}</span>
            <div className="flex gap-1.5">
              <Badge value={m.type} />
              <Badge value={m.status} />
            </div>
          </div>
          <div className="text-sm text-slate-200 mb-2">{m.problem || "—"}</div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 font-mono">
            <span>เครื่อง: {m.machine_code}</span>
            {m.reported_by && <span>แจ้งโดย: {m.reported_by}</span>}
            {m.downtime_min != null && <span className="text-amber-400">Downtime: {m.downtime_min} นาที</span>}
          </div>
        </div>
      ))}
    </div>
  );
}