import { useState } from "react";
import { api } from "../api";
import type { UnitTrace, LotTrace } from "../types";
import Badge from "./Badge";

type Mode = "forward" | "backward";

export default function Traceability() {
  const [mode, setMode] = useState<Mode>("forward");
  const [q, setQ] = useState("SN-0001");
  const [unit, setUnit] = useState<UnitTrace | null>(null);
  const [lot, setLot] = useState<LotTrace | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const search = async () => {
    const value = q.trim();
    if (!value) return;
    setError(""); setUnit(null); setLot(null); setLoading(true);
    try {
      if (mode === "forward") setUnit(await api.traceUnit(value));
      else setLot(await api.traceLot(value));
    } catch (e) {
      setError(e instanceof Error ? e.message : "ค้นหาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m); setUnit(null); setLot(null); setError("");
    setQ(m === "forward" ? "SN-0001" : "LOT-CU-2406");
  };

  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">ตรวจสอบย้อนกลับ (Traceability)</h2>

      <div className="flex gap-2 mb-3">
        <TabBtn active={mode === "forward"} onClick={() => switchMode("forward")}>ตามชิ้นงาน (Serial)</TabBtn>
        <TabBtn active={mode === "backward"} onClick={() => switchMode("backward")}>ตามล็อตวัตถุดิบ (Recall)</TabBtn>
      </div>

      <div className="flex gap-2 mb-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder={mode === "forward" ? "เช่น SN-0001" : "เช่น LOT-CU-2406"}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 font-mono text-sm outline-none focus:border-sky-500"
        />
        <button onClick={search} disabled={loading}
          className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold px-5 rounded-lg text-sm transition-colors">
          {loading ? "..." : "ค้นหา"}
        </button>
      </div>

      {error && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-4">{error}</div>}

      {unit && <UnitResult unit={unit} />}
      {lot && <LotResult lot={lot} />}
    </div>
  );
}

function UnitResult({ unit }: { unit: UnitTrace }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xl font-bold text-slate-100">{unit.serialNo}</span>
        <Badge value={unit.result} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <Field label="สินค้า" value={unit.product.name} />
        <Field label="ใบสั่งผลิต" value={unit.workOrder} mono />
        <Field label="เครื่องจักร" value={`${unit.machine.code} · ${unit.machine.name}`} />
        <Field label="ผู้ผลิต" value={unit.operator} />
        <Field label="เวลาผลิต" value={unit.producedAt} mono />
      </div>
      <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">วัตถุดิบที่ใช้</div>
      {unit.materials.map((m) => (
        <div key={m.lot} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2.5 mb-1.5">
          <div>
            <div className="text-sm text-slate-200">{m.materialName} <span className="text-slate-500 font-mono text-xs">({m.materialCode})</span></div>
            <div className="font-mono text-xs text-sky-400">{m.lot} · {m.supplier}</div>
          </div>
          <div className="font-mono text-sm text-slate-400">{m.qtyUsed}</div>
        </div>
      ))}
    </div>
  );
}

function LotResult({ lot }: { lot: LotTrace }) {
  return (
    <div className="bg-slate-900 border border-red-400/30 rounded-lg p-5">
      <div className="text-xs text-slate-400 mb-1">ล็อตวัตถุดิบ</div>
      <div className="font-mono text-xl font-bold text-slate-100 mb-4">{lot.lot}</div>
      <div className="text-sm text-red-400 mb-3">
        ⚠ มีชิ้นงาน {lot.affectedCount} ชิ้นที่ใช้ล็อตนี้ — ต้องตรวจสอบ/เรียกคืน
      </div>
      <div className="flex flex-wrap gap-2">
        {lot.units.map((u) => (
          <div key={u.serialNo} className="font-mono text-sm bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
            {u.serialNo} <span className="text-slate-500">· {u.workOrder}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500 mb-0.5">{label}</div>
      <div className={`text-sm text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition-colors ${
        active ? "text-sky-400 bg-sky-400/10 border-sky-400/40" : "text-slate-400 border-slate-700 hover:border-slate-600"
      }`}>
      {children}
    </button>
  );
}