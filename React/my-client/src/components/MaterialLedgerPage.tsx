import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Material, MaterialLedger as MaterialLedgerData, LedgerEntry } from "../types";

interface OutGroup {
  lot_no: string;
  count: number;
  totalQty: number;
  items: LedgerEntry[];
}
interface DayGroup {
  date: string;
  inEntries: LedgerEntry[];
  outGroups: OutGroup[];
}

function formatQty(n: number) {
  return Number(n.toFixed(3)).toString();
}

function groupByDay(entries: LedgerEntry[]): DayGroup[] {
  const days: Record<string, LedgerEntry[]> = {};
  for (const e of entries) {
    const day = e.ts.slice(0, 10);
    (days[day] ||= []).push(e);
  }
  return Object.entries(days)
    .map(([date, items]) => {
      const inEntries = items.filter((i) => i.type === "IN");
      const outItems = items.filter((i) => i.type === "OUT");
      const byLot: Record<string, OutGroup> = {};
      for (const o of outItems) {
        if (!byLot[o.lot_no]) byLot[o.lot_no] = { lot_no: o.lot_no, count: 0, totalQty: 0, items: [] };
        byLot[o.lot_no].count += 1;
        byLot[o.lot_no].totalQty += Number(o.qty);
        byLot[o.lot_no].items.push(o);
      }
      return { date, inEntries, outGroups: Object.values(byLot) };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export default function MaterialLedgerPage() {
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [materialId, setMaterialId] = useState("");
  const [ledger, setLedger] = useState<MaterialLedgerData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [daysToShow, setDaysToShow] = useState(5);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    api.getMaterials().then((list) => {
      setMaterials(list);
      if (list[0]) setMaterialId(list[0].id);
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!materialId) return;
    setLoading(true);
    setError("");
    setDaysToShow(5);
    setExpandedKey(null);
    api.getMaterialLedger(materialId)
      .then(setLedger)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [materialId]);

  const dayGroups = useMemo(() => (ledger ? groupByDay(ledger.entries) : []), [ledger]);
  const visibleGroups = dayGroups.slice(0, daysToShow);

  if (error && !materials) return <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-4">{error}</div>;
  if (!materials) return <div className="text-slate-500 text-sm py-12 text-center">กำลังโหลด...</div>;

  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">ประวัติวัตถุดิบ</h2>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {materials.map((m) => (
          <button key={m.id} onClick={() => setMaterialId(m.id)}
            className={`px-3.5 py-2 rounded-lg text-sm whitespace-nowrap border transition-colors ${
              materialId === m.id ? "text-sky-400 bg-sky-400/10 border-sky-400/40" : "text-slate-400 border-slate-700 hover:border-slate-600"
            }`}>
            {m.material_code} · {m.name}
          </button>
        ))}
      </div>

      {loading && <div className="text-slate-500 text-sm py-8 text-center">กำลังโหลดประวัติ...</div>}
      {error && !loading && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-4">{error}</div>}

      {ledger && !loading && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-400">คงเหลือรวมทุกล็อต</span>
            <span className="font-mono text-xl font-bold text-emerald-400">
              {ledger.totalRemaining} {ledger.material.unit}
            </span>
          </div>

          {dayGroups.length === 0 ? (
            <div className="text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
              ยังไม่มีความเคลื่อนไหวของวัตถุดิบนี้
            </div>
          ) : (
            <div className="space-y-4">
              {visibleGroups.map((day) => (
                <div key={day.date}>
                  <div className="text-[11px] text-slate-500 font-mono mb-1.5 px-1">
                    {new Date(day.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div className="space-y-1.5">
                    {day.inEntries.map((e, i) => (
                      <div key={`in-${i}`} className="flex items-center justify-between rounded-lg px-3.5 py-2.5 border bg-emerald-400/5 border-emerald-400/20">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-emerald-400 bg-emerald-400/10">รับเข้า</span>
                          <div className="text-sm">
                            <span className="font-mono text-slate-300">{e.lot_no}</span>
                            {e.ref && <span className="text-slate-500 text-xs ml-2">{e.ref}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm font-semibold text-emerald-400">+{e.qty}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{new Date(e.ts).toLocaleTimeString("th-TH")}</div>
                        </div>
                      </div>
                    ))}

                    {day.outGroups.map((g) => {
                      const key = `${day.date}-${g.lot_no}`;
                      const expanded = expandedKey === key;
                      return (
                        <div key={key} className="rounded-lg border bg-slate-900 border-slate-800 overflow-hidden">
                          <button onClick={() => setExpandedKey(expanded ? null : key)}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-slate-800/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-red-400 bg-red-400/10">ใช้ไป</span>
                              <div className="text-sm">
                                <span className="font-mono text-slate-300">{g.lot_no}</span>
                                <span className="text-slate-500 text-xs ml-2">{g.count} ครั้ง</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-red-400">-{formatQty(g.totalQty)}</span>
                              <span className={`text-[10px] text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
                            </div>
                          </button>
                          {expanded && (
                            <div className="border-t border-slate-800 divide-y divide-slate-800/60">
                              {g.items.map((it, i) => (
                                <div key={i} className="flex items-center justify-between px-3.5 py-2 text-xs">
                                  <span className="text-slate-400">{it.serial_no} <span className="text-slate-600">· {it.wo_no}</span></span>
                                  <div className="text-right">
                                    <span className="font-mono text-red-400">-{it.qty}</span>
                                    <span className="text-slate-600 font-mono ml-2">{new Date(it.ts).toLocaleTimeString("th-TH")}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {dayGroups.length > daysToShow && (
                <button onClick={() => setDaysToShow((d) => d + 5)}
                  className="w-full text-sm text-sky-400 hover:text-sky-300 border border-slate-800 hover:border-sky-500/40 rounded-lg py-2.5 transition-colors">
                  แสดงเพิ่มเติม ({dayGroups.length - daysToShow} วันที่เหลือ)
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}