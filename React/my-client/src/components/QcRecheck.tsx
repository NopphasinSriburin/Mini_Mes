import { useState } from "react";
import { api } from "../api";
import type { UnitLookup } from "../types";
import Badge from "./Badge";

export default function QcRecheck() {
  const [serial, setSerial] = useState("");
  const [unit, setUnit] = useState<UnitLookup | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const search = async () => {
    const value = serial.trim();
    if (!value) return;
    setError(""); setStatus(""); setUnit(null); setLoading(true);
    try {
      setUnit(await api.findUnitBySerial(value));
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

  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">ตรวจสอบคุณภาพภายหลัง (QC Recheck)</h2>
      <p className="text-sm text-slate-500 mb-4">
        สำหรับกรณีตรวจพบของเสียหลังจากบันทึกเป็นของดีไปแล้ว — ค้นหาด้วย serial แล้วตีกลับสถานะได้
      </p>

      <div className="flex gap-2 mb-5">
        <input value={serial} onChange={(e) => setSerial(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="เช่น SN-0001"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 font-mono text-sm outline-none focus:border-sky-500" />
        <button onClick={search} disabled={loading}
          className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold px-5 rounded-lg text-sm transition-colors">
          {loading ? "..." : "ค้นหา"}
        </button>
      </div>

      {error && <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg p-3">{error}</div>}
      {status && <div className="mb-4 text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 rounded-lg p-3">{status}</div>}

      {unit && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
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