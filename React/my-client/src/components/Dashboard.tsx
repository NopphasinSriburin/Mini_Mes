import { useEffect, useState } from "react";
import { api } from "../api";
import type { DashboardSummary } from "../types";
import Badge from "./Badge";
import YieldTrend from "./YieldTrend";

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getDashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox msg={error} />;
  if (!data) return <Loading />;

  const wo = data.workOrders;
  const running = data.machineStatus.find((m) => m.status === "RUNNING")?.count ?? 0;
  const totalMachines = data.machineStatus.reduce((s, m) => s + m.count, 0);

  const kpis = [
    { label: "กำลังผลิต (WO)", value: wo.in_progress },
    { label: "Quality Yield", value: data.qualityYieldPct != null ? `${data.qualityYieldPct}%` : "—", accent: "text-emerald-400" },
    { label: "เครื่องทำงาน", value: `${running}/${totalMachines}` },
    { label: "งานซ่อมค้าง", value: data.openMaintenance, accent: data.openMaintenance ? "text-red-400" : "" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-2">{k.label}</div>
            <div className={`font-mono text-2xl font-bold ${k.accent || "text-slate-100"}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* เตือนสต็อกวัตถุดิบใกล้หมด — เฉพาะล็อตที่ผูกกับ WO ที่กำลังผลิตอยู่ */}
      {data.lowStockLots.length > 0 && (
        <div className="mb-6">
          <SectionTitle>⚠ วัตถุดิบใกล้หมด</SectionTitle>
          <div className="space-y-1.5">
            {data.lowStockLots.map((l) => {
              const pct = Math.round((Number(l.qty_remaining) / Number(l.qty_received)) * 100);
              return (
                <div key={l.id} className="flex items-center justify-between bg-amber-400/5 border border-amber-400/30 rounded-lg px-3.5 py-2.5">
                  <div className="text-sm">
                    <span className="text-slate-200">{l.material_name}</span>
                    <span className="text-slate-500 font-mono text-xs ml-2">{l.lot_no}</span>
                    <span className="text-slate-500 text-xs ml-2">· ใช้ใน {l.wo_no}</span>
                  </div>
                  <span className="font-mono text-xs text-amber-400">เหลือ {l.qty_remaining} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* เครื่องจักรที่เสีย — โชว์รายละเอียดปัญหา */}
      {data.downMachines.length > 0 && (
        <div className="mb-6">
          <SectionTitle>🔧 เครื่องจักรที่มีปัญหา</SectionTitle>
          <div className="space-y-1.5">
            {data.downMachines.map((m) => (
              <div key={m.machine_code} className="flex items-center justify-between bg-red-400/5 border border-red-400/30 rounded-lg px-3.5 py-2.5">
                <div className="text-sm">
                  <span className="font-mono text-slate-200">{m.machine_code}</span>
                  <span className="text-slate-400 ml-2">{m.machine_name}</span>
                </div>
                <span className="text-xs text-red-400">{m.problem || "ไม่ระบุปัญหา"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WO ที่กำลังผลิต พร้อมความคืบหน้า */}
      {data.inProgressOrders.length > 0 && (
        <div className="mb-6">
          <SectionTitle>ใบสั่งผลิตที่กำลังดำเนินการ</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.inProgressOrders.map((w) => {
              const pct = w.qty_target ? Math.min(100, Math.round((w.qty_good / w.qty_target) * 100)) : 0;
              return (
                <div key={w.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-bold text-slate-100">{w.wo_no}</span>
                    <span className="font-mono text-xs text-slate-400">{w.qty_good}/{w.qty_target}</span>
                  </div>
                  <div className="text-xs text-slate-500 mb-2">{w.product_name}</div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <SectionTitle>สถานะเครื่องจักร</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {data.machineStatus.map((m) => (
          <div key={m.status} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
            <span className="font-mono text-xl font-bold text-slate-100">{m.count}</span>
            <Badge value={m.status} />
          </div>
        ))}
      </div>

      <SectionTitle>แนวโน้ม Quality Yield (10 WO ล่าสุดที่ปิดงาน)</SectionTitle>
      <YieldTrend />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{children}</h2>;
}
function Loading() {
  return <div className="text-slate-500 text-sm py-12 text-center">กำลังโหลด...</div>;
}
function ErrorBox({ msg }: { msg: string }) {
  return <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-4">{msg}</div>;
}