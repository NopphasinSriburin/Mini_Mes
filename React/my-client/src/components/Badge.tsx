// Badge — แสดงสถานะด้วยสีตามชนิด ใช้ร่วมทุกหน้า

const COLORS: Record<string, string> = {
  RUNNING: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  IDLE: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  DOWN: "text-red-400 bg-red-400/10 border-red-400/30",
  MAINTENANCE: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  IN_PROGRESS: "text-sky-400 bg-sky-400/10 border-sky-400/30",
  COMPLETED: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  PLANNED: "text-slate-400 bg-slate-400/10 border-slate-400/30",
  ON_HOLD: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  CANCELLED: "text-red-400 bg-red-400/10 border-red-400/30",
  PASS: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  FAIL: "text-red-400 bg-red-400/10 border-red-400/30",
  REWORK: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  OPEN: "text-red-400 bg-red-400/10 border-red-400/30",
  DONE: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  BREAKDOWN: "text-red-400 bg-red-400/10 border-red-400/30",
  PREVENTIVE: "text-sky-400 bg-sky-400/10 border-sky-400/30",
};

export default function Badge({ value }: { value: string }) {
  const cls = COLORS[value] || "text-slate-400 bg-slate-400/10 border-slate-400/30";
  return (
    <span className={`inline-block font-mono text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded border ${cls}`}>
      {value}
    </span>
  );
}