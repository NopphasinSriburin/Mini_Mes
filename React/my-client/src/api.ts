// ============================================================
// api.ts — ตัวกลางเรียก backend API
// จัดการ JWT token (เก็บ/แนบ/ลบ) และ error ในที่เดียว
// ============================================================

import type {
  LoginResponse, WorkOrder, UnitTrace, LotTrace,
  MaintenanceOrder, DashboardSummary, RecordUnitRequest, ProductionUnit,
} from "./types";

const BASE_URL = "http://localhost:8081/api";
const TOKEN_KEY = "mes_token";

// ---------- token helpers ----------
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// ---------- core fetch wrapper ----------
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // token หมดอายุ -> เคลียร์ แล้วให้ผู้ใช้ login ใหม่
  if (res.status === 401) {
    clearToken();
    throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "เกิดข้อผิดพลาด");
  }
  return data as T;
}

// ---------- API methods ----------
export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  getDashboard: () => request<DashboardSummary>("/dashboard/summary"),

  getWorkOrders: (status?: string) =>
    request<WorkOrder[]>(`/work-orders${status ? `?status=${status}` : ""}`),

  // บันทึกผลิต 1 ชิ้น (ของดี/ของเสีย) เข้า work order
  recordUnit: (workOrderId: string, body: RecordUnitRequest) =>
    request<ProductionUnit>(`/work-orders/${workOrderId}/units`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  traceUnit: (serial: string) =>
    request<UnitTrace>(`/trace/unit/${encodeURIComponent(serial)}`),

  traceLot: (lotNo: string) =>
    request<LotTrace>(`/trace/lot/${encodeURIComponent(lotNo)}`),

  getMaintenance: (status?: string) =>
    request<MaintenanceOrder[]>(`/maintenance${status ? `?status=${status}` : ""}`),
};