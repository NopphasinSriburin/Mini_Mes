import { useEffect, useState } from "react";
import { api } from "../api";
import type { Material, MaterialLedger as MaterialLedgerData } from "../types";

export default function MaterialLedgerPage() {
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [materialId, setMaterialId] = useState("");
  const [ledger, setLedger] = useState<MaterialLedgerData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    api.getMaterialLedger(materialId)
      .then(setLedger)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [materialId]);

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

          {ledger.entries.length === 0 ? (
            <div className="text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
              ยังไม่มีความเคลื่อนไหวของวัตถุดิบนี้
            </div>
          ) : (
            <div className="space-y-1.5">
              {ledger.entries.map((e, i) => (
                <div key={i} className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 border ${
                  e.type === "IN" ? "bg-emerald-400/5 border-emerald-400/20" : "bg-slate-900 border-slate-800"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      e.type === "IN" ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"
                    }`}>
                      {e.type === "IN" ? "รับเข้า" : "ใช้ไป"}
                    </span>
                    <div className="text-sm">
                      <span className="font-mono text-slate-300">{e.lot_no}</span>
                      {e.type === "IN" && e.ref && <span className="text-slate-500 text-xs ml-2">{e.ref}</span>}
                      {e.type === "OUT" && (
                        <span className="text-slate-500 text-xs ml-2">
                          {e.serial_no} · {e.wo_no}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-sm font-semibold ${e.type === "IN" ? "text-emerald-400" : "text-red-400"}`}>
                      {e.type === "IN" ? "+" : "-"}{e.qty}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">{new Date(e.ts).toLocaleString("th-TH")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}