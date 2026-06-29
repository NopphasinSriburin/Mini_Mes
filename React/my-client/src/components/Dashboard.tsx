import { useEffect, useState } from "react";
import { api } from "../api";
import type { DashboardSummary } from "../types";
import Badge from "./Badge";

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getDashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox msg={error} />;
  if (!data) return <Loading />;

  const wo = data.workOrders;
  const running =
    data.machineStatus.find((m) => m.status === "RUNNING")?.count ?? 0;
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

      <SectionTitle>สถานะเครื่องจักร</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {data.machineStatus.map((m) => (
          <div key={m.status} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
            <span className="font-mono text-xl font-bold text-slate-100">{m.count}</span>
            <Badge value={m.status} />
          </div>
        ))}
      </div>
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