import { useEffect, useState } from "react";
import { api } from "../api";
import type { MaintenanceOrder, Machine, MaintenanceType } from "../types";
import Badge from "./Badge";

export default function Maintenance() {
  const [orders, setOrders] = useState<MaintenanceOrder[] | null>(null);
  const [machines, setMachines] = useState<Machine[] | null>(null);
  const [error, setError] = useState("");

  // ฟอร์มแจ้งซ่อมใหม่
  const [showReportForm, setShowReportForm] = useState(false);
  const [moNo, setMoNo] = useState("");
  const [machineId, setMachineId] = useState("");
  const [type, setType] = useState<MaintenanceType>("BREAKDOWN");
  const [problem, setProblem] = useState("");
  const [reporting, setReporting] = useState(false);

  // ฟอร์มปิดงาน — เก็บว่ากำลังปิดใบไหนอยู่
  const [closingId, setClosingId] = useState<string | null>(null);
  const [actionTaken, setActionTaken] = useState("");
  const [downtimeMin, setDowntimeMin] = useState("");
  const [closing, setClosing] = useState(false);

  const load = () => api.getMaintenance().then(setOrders).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api.getMachines().then((list) => {
      setMachines(list);
      if (list[0]) setMachineId(list[0].id);
    }).catch((e) => setError(e.message));
  }, []);

  // สุ่มเลขที่ใบแจ้งซ่อมตั้งต้น
  const genMoNo = () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const seq = String(Math.floor(Math.random() * 900) + 100);
    return `MO-${yy}${mm}-${seq}`;
  };

  const openReportForm = () => {
    setMoNo(genMoNo());
    setProblem("");
    setType("BREAKDOWN");
    setShowReportForm(true);
  };

  const submitReport = async () => {
    if (!moNo || !machineId) {
      setError("กรุณากรอกเลขที่ใบแจ้งซ่อมและเลือกเครื่องจักร");
      return;
    }
    setReporting(true);
    setError("");
    try {
      await api.createMaintenance({ moNo, machineId, type, problem: problem.trim() || undefined });
      setShowReportForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "แจ้งซ่อมไม่สำเร็จ");
    } finally {
      setReporting(false);
    }
  };

  const openCloseForm = (id: string) => {
    setActionTaken("");
    setDowntimeMin("");
    setClosingId(id);
  };

  const submitClose = async (id: string) => {
    setClosing(true);
    setError("");
    try {
      await api.closeMaintenance(id, {
        actionTaken: actionTaken.trim() || undefined,
        downtimeMin: downtimeMin ? Number(downtimeMin) : undefined,
      });
      setClosingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ปิดงานไม่สำเร็จ");
    } finally {
      setClosing(false);
    }
  };

  if (error && !orders) return <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-4">{error}</div>;
  if (!orders || !machines) return <div className="text-slate-500 text-sm py-12 text-center">กำลังโหลด...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">ระบบซ่อมบำรุง (Maintenance)</h2>
        {!showReportForm && (
          <button onClick={openReportForm}
            className="text-xs bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-3.5 py-1.5 rounded-lg transition-colors">
            + แจ้งซ่อมใหม่
          </button>
        )}
      </div>

      {showReportForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">เลขที่ใบแจ้งซ่อม</label>
              <input value={moNo} onChange={(e) => setMoNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">เครื่องจักร</label>
              <select value={machineId} onChange={(e) => setMachineId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500">
                {machines.map((m) => <option key={m.id} value={m.id}>{m.machine_code} · {m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">ประเภท</label>
              <select value={type} onChange={(e) => setType(e.target.value as MaintenanceType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500">
                <option value="BREAKDOWN">ซ่อมฉุกเฉิน (Breakdown)</option>
                <option value="PREVENTIVE">ซ่อมเชิงป้องกัน (Preventive)</option>
              </select>
            </div>
          </div>
          <label className="block text-xs text-slate-400 mb-1">รายละเอียดปัญหา</label>
          <textarea value={problem} onChange={(e) => setProblem(e.target.value)}
            placeholder="เช่น หัวทดสอบไม่อ่านค่า" rows={2}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 mb-3 resize-none" />
          <div className="flex gap-2">
            <button onClick={submitReport} disabled={reporting}
              className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg px-4 py-2 text-sm transition-colors">
              {reporting ? "กำลังบันทึก..." : "แจ้งซ่อม"}
            </button>
            <button onClick={() => setShowReportForm(false)}
              className="text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg px-4 py-2 text-sm transition-colors">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {error && <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg p-3">{error}</div>}

      {orders.length === 0 && (
        <div className="text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
          ยังไม่มีใบแจ้งซ่อม
        </div>
      )}

      {orders.map((m) => {
        const isOpen = m.status === "OPEN" || m.status === "IN_PROGRESS";
        const isClosingThis = closingId === m.id;
        return (
          <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-2.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-mono font-bold text-slate-100">{m.mo_no}</span>
              <div className="flex gap-1.5">
                <Badge value={m.type} />
                <Badge value={m.status} />
              </div>
            </div>
            <div className="text-sm text-slate-200 mb-2">{m.problem || "—"}</div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 font-mono mb-2">
              <span>เครื่อง: {m.machine_code}</span>
              {m.reported_by && <span>แจ้งโดย: {m.reported_by}</span>}
              {m.downtime_min != null && <span className="text-amber-400">Downtime: {m.downtime_min} นาที</span>}
            </div>

            {isOpen && !isClosingThis && (
              <button onClick={() => openCloseForm(m.id)}
                className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg transition-colors">
                ✓ ปิดงานซ่อม
              </button>
            )}

            {isClosingThis && (
              <div className="bg-slate-800/40 rounded-lg p-3 mt-2">
                <label className="block text-xs text-slate-400 mb-1">วิธีแก้ไข</label>
                <input value={actionTaken} onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="เช่น เปลี่ยนหัวเซนเซอร์ใหม่"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 mb-2" />
                <label className="block text-xs text-slate-400 mb-1">เวลาที่เครื่องหยุด (นาที)</label>
                <input type="number" value={downtimeMin} onChange={(e) => setDowntimeMin(e.target.value)}
                  placeholder="เช่น 45"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 outline-none focus:border-sky-500 mb-3" />
                <div className="flex gap-2">
                  <button onClick={() => submitClose(m.id)} disabled={closing}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg px-4 py-1.5 text-xs transition-colors">
                    {closing ? "กำลังบันทึก..." : "ยืนยันปิดงาน"}
                  </button>
                  <button onClick={() => setClosingId(null)}
                    className="text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg px-4 py-1.5 text-xs transition-colors">
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}