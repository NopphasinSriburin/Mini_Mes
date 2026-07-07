import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { UnitTrace, LotTrace, TraceSearchResult } from "../types";
import Badge from "./Badge";

export default function Traceability() {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<TraceSearchResult | null>(null);
  const [recent, setRecent] = useState<TraceSearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  const [unitTrace, setUnitTrace] = useState<UnitTrace | null>(null);
  const [lotTrace, setLotTrace] = useState<LotTrace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // โหลดรายการล่าสุดตอนเปิดหน้า — กดได้เลยไม่ต้องพิมพ์
  useEffect(() => {
    api.traceRecent().then(setRecent).catch(() => {});
  }, []);

  // ค้นหาสดขณะพิมพ์ (debounce 300ms กันยิง request รัวเกิน)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const value = q.trim();
    if (!value) {
      setSuggestions(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      api.traceSearch(value)
        .then(setSuggestions)
        .catch(() => setSuggestions(null))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  const openUnit = async (serial: string) => {
    setLoading(true);
    setError("");
    setUnitTrace(null);
    setLotTrace(null);
    setSuggestions(null);
    setQ("");
    try {
      setUnitTrace(await api.traceUnit(serial));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const openLot = async (lotNo: string) => {
    setLoading(true);
    setError("");
    setUnitTrace(null);
    setLotTrace(null);
    setSuggestions(null);
    setQ("");
    try {
      setLotTrace(await api.traceLot(lotNo));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const showingSuggestions = q.trim().length > 0;
  const listSource = showingSuggestions ? suggestions : recent;

  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">ตรวจสอบย้อนกลับ (Traceability)</h2>

      {/* ช่องค้นหาเดียว — หาทั้งชิ้นงานและล็อตพร้อมกัน */}
      <div className="relative mb-5">
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="พิมพ์ค้นหาชิ้นงาน / ล็อต / ชื่อวัตถุดิบ เช่น 0001, CU, ทองแดง"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-100 text-sm outline-none focus:border-sky-500" />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
        </svg>
        {searching && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">กำลังค้นหา...</span>
        )}
      </div>

      {error && <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg p-3">{error}</div>}
      {loading && <div className="text-slate-500 text-sm py-8 text-center">กำลังโหลดข้อมูล...</div>}

      {/* รายการให้เลือก — จากการค้นหา หรือรายการล่าสุดถ้ายังไม่พิมพ์ */}
      {!loading && !unitTrace && !lotTrace && listSource && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">
              {showingSuggestions ? "ชิ้นงานที่ตรงกับคำค้น" : "ชิ้นงานผลิตล่าสุด"} — กดเพื่อดูเส้นทางวัตถุดิบ
            </div>
            {listSource.units.length === 0 ? (
              <div className="text-slate-600 text-sm bg-slate-900/50 border border-slate-800 rounded-lg p-4 text-center">ไม่พบชิ้นงาน</div>
            ) : (
              <div className="space-y-1.5">
                {listSource.units.map((u) => (
                  <button key={u.serial_no} onClick={() => openUnit(u.serial_no)}
                    className="w-full flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-lg px-3.5 py-2.5 text-left transition-colors">
                    <div>
                      <div className="font-mono text-sm text-slate-100">{u.serial_no}</div>
                      <div className="text-[11px] text-slate-500">{u.product_name} · {u.wo_no}</div>
                    </div>
                    <Badge value={u.result} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">
              {showingSuggestions ? "ล็อตวัตถุดิบที่ตรงกับคำค้น" : "ล็อตวัตถุดิบล่าสุด"} — กดเพื่อดูสินค้าที่กระทบ (Recall)
            </div>
            {listSource.lots.length === 0 ? (
              <div className="text-slate-600 text-sm bg-slate-900/50 border border-slate-800 rounded-lg p-4 text-center">ไม่พบล็อต</div>
            ) : (
              <div className="space-y-1.5">
                {listSource.lots.map((l) => (
                  <button key={l.lot_no} onClick={() => openLot(l.lot_no)}
                    className="w-full flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-lg px-3.5 py-2.5 text-left transition-colors">
                    <div>
                      <div className="font-mono text-sm text-slate-100">{l.lot_no}</div>
                      <div className="text-[11px] text-slate-500">{l.material_name}{l.supplier ? ` · ${l.supplier}` : ""}</div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0 ml-2">
                      ใช้ไป {l.usage_count} ชิ้น
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- ผลลัพธ์ Forward Trace (ชิ้นงาน → วัตถุดิบ) ---------- */}
      {unitTrace && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <button onClick={() => setUnitTrace(null)} className="text-xs text-sky-400 hover:text-sky-300 mb-3 transition-colors">
            ← กลับไปค้นหา
          </button>
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-xl font-bold text-slate-100">{unitTrace.serialNo}</span>
            <Badge value={unitTrace.result} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5 text-sm">
            <Info label="สินค้า" value={unitTrace.product.name} />
            <Info label="ใบสั่งผลิต" value={unitTrace.workOrder} mono />
            <Info label="เครื่องจักร" value={unitTrace.machine.code ? `${unitTrace.machine.code} · ${unitTrace.machine.name}` : "—"} />
            <Info label="ผู้ผลิต" value={unitTrace.operator || "—"} />
            <Info label="เวลาผลิต" value={new Date(unitTrace.producedAt).toLocaleString("th-TH")} mono />
          </div>

          <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">วัตถุดิบที่ใช้</div>
          {unitTrace.materials.length === 0 ? (
            <div className="text-slate-500 text-sm">ไม่มีข้อมูลวัตถุดิบ</div>
          ) : (
            <div className="space-y-1.5">
              {unitTrace.materials.map((m, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3.5 py-2.5">
                  <div>
                    <span className="text-sm text-slate-200">{m.materialName}</span>
                    <span className="text-slate-500 font-mono text-xs ml-2">({m.materialCode})</span>
                    <div className="text-[11px] font-mono text-sky-400">{m.lot}{m.supplier ? ` · ${m.supplier}` : ""}</div>
                  </div>
                  <span className="font-mono text-sm text-slate-300">{m.qtyUsed}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- ผลลัพธ์ Backward Trace (ล็อต → สินค้าที่กระทบ) ---------- */}
      {lotTrace && (
        <div className="bg-slate-900 border border-red-400/30 rounded-lg p-5">
          <button onClick={() => setLotTrace(null)} className="text-xs text-sky-400 hover:text-sky-300 mb-3 transition-colors">
            ← กลับไปค้นหา
          </button>
          <div className="text-center mb-4">
            <div className="text-[11px] text-slate-500 mb-1">ล็อตวัตถุดิบ</div>
            <div className="font-mono text-xl font-bold text-slate-100">{lotTrace.lot}</div>
            {lotTrace.affectedCount > 0 ? (
              <div className="text-sm text-red-400 mt-2">
                ⚠ มีชิ้นงาน {lotTrace.affectedCount} ชิ้นที่ใช้ล็อตนี้ — ต้องตรวจสอบ/เรียกคืน
              </div>
            ) : (
              <div className="text-sm text-emerald-400 mt-2">ยังไม่มีชิ้นงานไหนใช้ล็อตนี้</div>
            )}
          </div>

          {lotTrace.units.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {lotTrace.units.map((u) => (
                <button key={u.serialNo} onClick={() => openUnit(u.serialNo)}
                  className="bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-lg px-3 py-2 text-left transition-colors">
                  <span className="font-mono text-sm text-slate-100">{u.serialNo}</span>
                  <span className="text-[11px] text-slate-500 font-mono ml-2">{u.workOrder}</span>
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-3">กดที่ชิ้นงานเพื่อดูรายละเอียดการผลิตของชิ้นนั้น</p>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500 mb-0.5">{label}</div>
      <div className={`text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}