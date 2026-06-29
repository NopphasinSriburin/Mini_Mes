import { useState } from "react";
import { api, setToken } from "../api";
import type { User } from "../types";

export default function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState("engineer");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.login(username, password);
      setToken(res.token);
      onLogin(res.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-sky-500 flex items-center justify-center font-mono font-extrabold text-slate-950 text-lg">
            M
          </div>
          <div>
            <h1 className="text-slate-100 font-bold text-lg leading-tight">Mini MES</h1>
            <p className="text-slate-500 text-xs">Manufacturing Execution System</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-slate-200 font-semibold mb-5">เข้าสู่ระบบ</h2>

          <label className="block text-xs text-slate-400 mb-1">ชื่อผู้ใช้</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full mb-4 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm outline-none focus:border-sky-500"
          />

          <label className="block text-xs text-slate-400 mb-1">รหัสผ่าน</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full mb-4 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm outline-none focus:border-sky-500"
          />

          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>

          <p className="text-slate-600 text-xs mt-4 text-center">
            ทดลอง: engineer / password123
          </p>
        </div>
      </div>
    </div>
  );
}