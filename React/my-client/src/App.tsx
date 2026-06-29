import { useState } from "react";
import { getToken, clearToken } from "./api";
import type { User } from "./types";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Production from "./components/Production";
import Andon from "./components/Andon";
import Traceability from "./components/Traceability";
import Maintenance from "./components/Maintenance";

type TabId = "dashboard" | "production" | "andon" | "trace" | "maintenance";

const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "แดชบอร์ด" },
  { id: "production", label: "การผลิต" },
  { id: "andon", label: "บันทึกผลิต" },
  { id: "trace", label: "ตรวจสอบย้อนกลับ" },
  { id: "maintenance", label: "ซ่อมบำรุง" },
];

export default function App() {
  // ถ้ามี token อยู่แล้วถือว่า login (ตัวอย่างง่าย ๆ — production ควร verify token กับ backend)
  const [user, setUser] = useState<User | null>(null);
  const [authed, setAuthed] = useState(!!getToken());
  const [tab, setTab] = useState<TabId>("dashboard");

  const handleLogin = (u: User) => { setUser(u); setAuthed(true); };
  const handleLogout = () => { clearToken(); setUser(null); setAuthed(false); };

  if (!authed) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-sky-500 flex items-center justify-center font-mono font-extrabold text-slate-950">M</div>
          <div>
            <div className="font-bold text-base leading-tight">Mini MES</div>
            <div className="text-xs text-slate-500">Smart Factory · Manufacturing Execution</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user && <span className="text-xs text-slate-400 font-mono hidden sm:inline">{user.fullName} · {user.role}</span>}
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 transition-colors">
            ออกจากระบบ
          </button>
        </div>
      </header>

      <nav className="flex gap-1 px-6 border-b border-slate-800 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? "text-slate-100 border-sky-500 font-semibold" : "text-slate-400 border-transparent hover:text-slate-300"
            }`}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="p-6 max-w-5xl mx-auto">
        {tab === "dashboard" && <Dashboard />}
        {tab === "production" && <Production />}
        {tab === "andon" && <Andon />}
        {tab === "trace" && <Traceability />}
        {tab === "maintenance" && <Maintenance />}
      </main>
    </div>
  );
}