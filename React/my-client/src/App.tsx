import { useState } from "react";
import { getToken, clearToken } from "./api";
import type { User } from "./types";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Production from "./components/Production";
import Andon from "./components/Andon";
import CreateWorkOrder from "./components/CreateWorkOrder";
import ProductionHistory from "./components/ProductionHistory";
import BomSettings from "./components/BomSettings";
import QcRecheck from "./components/QcRecheck";
import ReceiveMaterial from "./components/ReceiveMaterial";
import MaterialLedgerPage from "./components/MaterialLedgerPage";
import Traceability from "./components/Traceability";
import Maintenance from "./components/Maintenance";

type TabId = "dashboard" | "production" | "create-wo" | "andon" | "history" | "bom" | "receive" | "material-ledger" | "qc" | "trace" | "maintenance";

interface NavItem { id: TabId; label: string }
interface NavGroup { key: string; label: string; items: NavItem[] }

// จัดกลุ่มเมนูเป็นหมวดหมู่ในไซด์บาร์ — กลุ่มที่มีหลายหน้าขยาย/หุบได้ (accordion)
const NAV_GROUPS: NavGroup[] = [
  { key: "dashboard", label: "แดชบอร์ด", items: [{ id: "dashboard", label: "แดชบอร์ด" }] },
  {
    key: "production", label: "การผลิต", items: [
      { id: "production", label: "ใบสั่งผลิต" },
      { id: "create-wo", label: "สร้าง WO ใหม่" },
      { id: "andon", label: "บันทึกผลิต (Andon)" },
      { id: "history", label: "ประวัติการผลิต" },
    ],
  },
  {
    key: "material", label: "วัตถุดิบ", items: [
      { id: "bom", label: "ตั้งค่าสูตร (BOM)" },
      { id: "receive", label: "รับวัตถุดิบเข้าคลัง" },
      { id: "material-ledger", label: "ประวัติวัตถุดิบ" },
    ],
  },
  {
    key: "quality", label: "คุณภาพ", items: [
      { id: "qc", label: "QC ตรวจสอบภายหลัง" },
      { id: "trace", label: "ตรวจสอบย้อนกลับ" },
    ],
  },
  { key: "maintenance", label: "ซ่อมบำรุง", items: [{ id: "maintenance", label: "ซ่อมบำรุง" }] },
];

export default function App() {
  // ถ้ามี token อยู่แล้วถือว่า login (ตัวอย่างง่าย ๆ — production ควร verify token กับ backend)
  const [user, setUser] = useState<User | null>(null);
  const [authed, setAuthed] = useState(!!getToken());
  const [tab, setTab] = useState<TabId>("dashboard");

  const [expandedGroups, setExpandedGroups] = useState<string[]>(["production"]);

  const handleLogin = (u: User) => { setUser(u); setAuthed(true); };
  const handleLogout = () => { clearToken(); setUser(null); setAuthed(false); };

  if (!authed) return <Login onLogin={handleLogin} />;

  const selectTab = (id: TabId) => setTab(id);
  const toggleGroup = (key: string) =>
    setExpandedGroups((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* ---------- Sidebar ---------- */}
      <aside className="w-60 shrink-0 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-sky-500 flex items-center justify-center font-mono font-extrabold text-slate-950 shrink-0">M</div>
          <div className="min-w-0">
            <div className="font-bold text-sm leading-tight truncate">Mini MES</div>
            <div className="text-[11px] text-slate-500 truncate">Smart Factory · MES</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {NAV_GROUPS.map((g) => {
            const isSingle = g.items.length === 1;

            if (isSingle) {
              const item = g.items[0];
              const active = tab === item.id;
              return (
                <button key={g.key} onClick={() => selectTab(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
                    active ? "bg-sky-400/10 text-sky-400 font-semibold" : "text-slate-300 hover:bg-slate-800/60"
                  }`}>
                  {g.label}
                </button>
              );
            }

            const expanded = expandedGroups.includes(g.key);
            const hasActive = g.items.some((i) => i.id === tab);

            return (
              <div key={g.key} className="mb-0.5">
                <button onClick={() => toggleGroup(g.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    hasActive ? "text-slate-100 font-semibold" : "text-slate-300 hover:bg-slate-800/60"
                  }`}>
                  {g.label}
                  <span className={`text-[10px] text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
                </button>
                {expanded && (
                  <div className="mt-0.5 ml-2 pl-3 border-l border-slate-800 space-y-0.5">
                    {g.items.map((item) => {
                      const active = tab === item.id;
                      return (
                        <button key={item.id} onClick={() => selectTab(item.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            active ? "bg-sky-400/10 text-sky-400 font-semibold" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                          }`}>
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          {user && (
            <div className="text-[11px] text-slate-500 font-mono mb-2 px-1 truncate">{user.fullName} · {user.role}</div>
          )}
          <button onClick={handleLogout}
            className="w-full text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg px-3 py-2 transition-colors">
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ---------- Main content ---------- */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          {tab === "dashboard" && <Dashboard />}
          {tab === "production" && <Production />}
          {tab === "create-wo" && <CreateWorkOrder />}
          {tab === "andon" && <Andon />}
          {tab === "history" && <ProductionHistory />}
          {tab === "bom" && <BomSettings />}
          {tab === "receive" && <ReceiveMaterial />}
          {tab === "material-ledger" && <MaterialLedgerPage />}
          {tab === "qc" && <QcRecheck />}
          {tab === "trace" && <Traceability />}
          {tab === "maintenance" && <Maintenance />}
        </div>
      </main>
    </div>
  );
}