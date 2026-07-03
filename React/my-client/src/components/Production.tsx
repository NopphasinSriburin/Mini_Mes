import { useEffect, useState } from "react";
import { api } from "../api";
import type { WorkOrder } from "../types";
import Badge from "./Badge";

export default function Production() {
  const [orders, setOrders] = useState<WorkOrder[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => api.getWorkOrders().then(setOrders).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const startProduction = async (id: string) => {
    setBusyId(id);
    setError("");
    try {
      await api.setWorkOrderStatus(id, "IN_PROGRESS");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เริ่มผลิตไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  const deleteWo = async (id: string, woNo: string) => {
    if (!window.confirm(`ลบใบสั่งผลิต ${woNo}? การกระทำนี้ย้อนกลับไม่ได้`)) return;
    setBusyId(id);
    setError("");
    try {
      await api.deleteWorkOrder(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-4">{error}</div>;
  if (!orders) return <div className="text-slate-500 text-sm py-12 text-center">กำลังโหลด...</div>;

  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">ใบสั่งผลิต (Work Orders)</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/50 text-slate-400 text-[11px] uppercase tracking-wide">
              <Th>WO No.</Th><Th>สินค้า</Th><Th right>เป้า</Th><Th right>ดี</Th><Th right>เสีย</Th><Th>สถานะ</Th><Th>การจัดการ</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((w) => {
              const done = w.qty_good + w.qty_defect;
              const pct = w.qty_target ? Math.round((done / w.qty_target) * 100) : 0;
              return (
                <tr key={w.id} className="border-t border-slate-800">
                  <Td mono>{w.wo_no}</Td>
                  <Td>
                    <div className="text-slate-200">{w.product_name}</div>
                    <div className="mt-1.5 h-1 bg-slate-800 rounded overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${pct}%` }} />
                    </div>
                  </Td>
                  <Td right mono>{w.qty_target}</Td>
                  <Td right mono className="text-emerald-400">{w.qty_good}</Td>
                  <Td right mono className={w.qty_defect ? "text-red-400" : "text-slate-500"}>{w.qty_defect}</Td>
                  <Td><Badge value={w.status} /></Td>
                  <Td>
                    <div className="flex gap-1.5">
                      {w.status === "PLANNED" && (
                        <button onClick={() => startProduction(w.id)} disabled={busyId === w.id}
                          className="text-xs bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                          {busyId === w.id ? "..." : "▶ เริ่มผลิต"}
                        </button>
                      )}
                      {w.qty_good === 0 && w.qty_defect === 0 && (
                        <button onClick={() => deleteWo(w.id, w.wo_no)} disabled={busyId === w.id}
                          title="ลบใบสั่งผลิตนี้ (ยังไม่มีการผลิตจริง)"
                          className="text-xs text-slate-500 hover:text-red-400 disabled:opacity-50 border border-slate-700 hover:border-red-400/40 px-2.5 py-1.5 rounded-lg transition-colors">
                          ✕ ลบ
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-3.5 py-2.5 font-semibold ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, right, mono, className = "" }: { children: React.ReactNode; right?: boolean; mono?: boolean; className?: string }) {
  return (
    <td className={`px-3.5 py-3 align-top text-slate-200 ${right ? "text-right" : "text-left"} ${mono ? "font-mono" : ""} ${className}`}>
      {children}
    </td>
  );
}