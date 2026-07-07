import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { UnitLookup, TraceSearchUnit } from "../types";
import Badge from "./Badge";

export default function QcRecheck() {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<TraceSearchUnit[] | null>(null);
  const [recent, setRecent] = useState<TraceSearchUnit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [unit, setUnit] = useState<UnitLookup | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // เปิดหน้ามาเห็นชิ้นงานล่าสุดให้กดเลย ไม่ต้องรู้จักหมายเลขชิ้นงานล่วงหน้า
  useEffect(() => {
    api.traceRecent().then((r) => setRecent(r.units)).catch(() => {});
  }, []);

  // ค้นหาสดขณะพิมพ์ — พิมพ์แค่บางส่วนก็เจอ
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
        .then((r) => setSuggestions(r.units))
        .catch(() => setSuggestions(null))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  const select = async (serial: string) => {
    setLoading(true);
    setError(""); setStatus("");
    setUnit(null);
    try {
      setUnit(await api.findUnitBySerial(serial));
      setQ("");
      setSuggestions(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ค้นหาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    if (!unit) return;
    setRejecting(true);
    setError("");
    try {
      const res = await api.rejectUnit(unit.work_order_id, unit.id, reason);
      const newWoStatus = res?.workOrder?.status;
      setStatus(
        newWoStatus === "IN_PROGRESS" && unit.wo_status === "COMPLETED"
          ? `ตีกลับเรียบร้อย — ใบสั่งผลิต ${unit.wo_no} ถูกเปิดกลับเป็น IN_PROGRESS เพื่อผลิตชดเชย`
          : "ตีกลับเป็นของเสียเรียบร้อย"
      );
      setUnit({ ...unit, result: "FAIL", reject_reason: reason, rejected_at: new Date().toISOString() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "ตีกลับไม่สำเร็จ");
    } finally {
      setRejecting(false);
    }
  };

  const listSource = q.trim() ? suggestions : recent;

  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">ตรวจสอบคุณภาพภายหลัง (QC Recheck)</h2>
      <p className="text-sm text-slate-500 mb-4">
        สำหรับกรณีตรวจพบของเสียหลังจากบันทึกเป็นของดีไปแล้ว — เลือกชิ้นงานจากรายการด้านล่าง หรือพิมพ์ค้นหาแล้วตีกลับสถานะได้
      </p>

      {!unit && (
        <>
          <div className="relative mb-5">
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="พิมพ์ค้นหาชิ้นงาน เช่น เลขท้าย 0001 หรือชื่อสินค้า"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-100 text-sm outline-none focus:border-sky-500" />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            {searching && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">กำลังค้นหา...</span>}
          </div>

          <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">
            {q.trim() ? "ผลการค้นหา" : "ชิ้นงานผลิตล่าสุด"} — กดเพื่อเลือก
          </div>
          {loading && <div className="text-slate-500 text-sm py-6 text-center">กำลังโหลด...</div>}
          {!loading && listSource && listSource.length === 0 && (
            <div className="text-slate-600 text-sm bg-slate-900/50 border border-slate-800 rounded-lg p-4 text-center">ไม่พบชิ้นงาน</div>
          )}
          {!loading && listSource && listSource.length > 0 && (
            <div className="space-y-1.5">
              {listSource.map((u) => (
                <button key={u.serial_no} onClick={() => select(u.serial_no)}
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
        </>
      )}

      {error && <div className="mt-4 text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg p-3">{error}</div>}
      {status && <div className="mt-4 text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 rounded-lg p-3">{status}</div>}

      {unit && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <button onClick={() => setUnit(null)} className="text-xs text-sky-400 hover:text-sky-300 mb-3 transition-colors">
            ← กลับไปเลือกชิ้นงานอื่น
          </button>
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-xl font-bold text-slate-100">{unit.serial_no}</span>
            <Badge value={unit.result} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
            <div>
              <div className="text-[11px] text-slate-500 mb-0.5">สินค้า</div>
              <div className="text-slate-200">{unit.product_name}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 mb-0.5">ใบสั่งผลิต</div>
              <div className="text-slate-200 font-mono">{unit.wo_no}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 mb-0.5">เวลาผลิต</div>
              <div className="text-slate-200 font-mono">{new Date(unit.produced_at).toLocaleString("th-TH")}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 mb-0.5">สถานะ WO ปัจจุบัน</div>
              <Badge value={unit.wo_status} />
            </div>
          </div>

          {unit.result === "PASS" ? (
            <>
              <label className="block text-xs text-slate-400 mb-1">เหตุผลที่ตีกลับ (ไม่บังคับ)</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="เช่น พบรอยร้าวตอนตรวจสอบ, สีไม่ผ่านมาตรฐาน"
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 mb-3 resize-none" />
              <button onClick={reject} disabled={rejecting}
                className="w-full bg-red-500 hover:bg-red-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg py-2.5 text-sm transition-colors">
                {rejecting ? "กำลังบันทึก..." : "✕ ตีกลับเป็นของเสีย"}
              </button>
            </>
          ) : (
            <div className="text-sm text-slate-400 bg-slate-800/50 rounded-lg p-3">
              ชิ้นงานนี้เป็นของเสียอยู่แล้ว
              {unit.reject_reason && <div className="mt-1 text-slate-500">เหตุผล: {unit.reject_reason}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}