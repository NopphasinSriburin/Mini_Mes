import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { api } from "../api";
import type { WorkOrder } from "../types";

interface ChartPoint {
  woNo: string;
  yieldPct: number;
}

export default function YieldTrend() {
  const [orders, setOrders] = useState<WorkOrder[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getWorkOrders("COMPLETED").then(setOrders).catch((e) => setError(e.message));
  }, []);

  if (error) return null; // ไม่ให้ error กราฟไปบัง dashboard ส่วนอื่น
  if (!orders) return <div className="text-slate-500 text-xs py-4 text-center">กำลังโหลดกราฟ...</div>;
  if (orders.length === 0) return null;

  // เอา 10 ใบล่าสุด เรียงเก่า→ใหม่ให้อ่านแนวโน้มง่าย
  const recent = [...orders].reverse().slice(-10);
  const data: ChartPoint[] = recent.map((w) => {
    const total = w.qty_good + w.qty_defect;
    return {
      woNo: w.wo_no.replace("WO-", ""),
      yieldPct: total > 0 ? Math.round((w.qty_good / total) * 1000) / 10 : 0,
    };
  });

  const barColor = (pct: number) => (pct >= 90 ? "#34d399" : pct >= 75 ? "#38bdf8" : "#f87171");

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="woNo" tick={{ fill: "#64748b", fontSize: 11, fontFamily: "monospace" }} axisLine={{ stroke: "#334155" }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              formatter={(value) => [`${value}%`, "Yield"]}
              labelFormatter={(label) => `WO-${label}`}
              contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#94a3b8" }}
              itemStyle={{ color: "#e2e8f0" }}
              cursor={{ fill: "#1e293b" }}
            />
            <Bar dataKey="yieldPct" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={barColor(d.yieldPct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}