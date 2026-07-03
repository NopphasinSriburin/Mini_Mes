// ============================================================
// api.ts — ตัวกลางเรียก backend API
// จัดการ JWT token (เก็บ/แนบ/ลบ) และ error ในที่เดียว
// ============================================================

import type {
  LoginResponse, WorkOrder, UnitTrace, LotTrace,
  MaintenanceOrder, DashboardSummary, RecordUnitRequest, ProductionUnit,
  Product, Material, MaterialLot, BomItem, BomItemInput,
  CreateWorkOrderRequest, WorkOrderDetail, UnitLookup, ReservedMaterial, CreateLotRequest,
  MaterialLedger, Machine, CreateMaintenanceRequest, CloseMaintenanceRequest,
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

  getMachines: () => request<Machine[]>("/maintenance/machines/all"),

  createMaintenance: (body: CreateMaintenanceRequest) =>
    request<MaintenanceOrder>("/maintenance", { method: "POST", body: JSON.stringify(body) }),

  closeMaintenance: (id: string, body: CloseMaintenanceRequest) =>
    request<MaintenanceOrder>(`/maintenance/${id}/close`, { method: "PATCH", body: JSON.stringify(body) }),

  // ---------- products & BOM ----------
  getProducts: () => request<Product[]>("/products"),

  getBom: (productId: string) => request<BomItem[]>(`/products/${productId}/bom`),

  setBom: (productId: string, items: BomItemInput[]) =>
    request<BomItem[]>(`/products/${productId}/bom`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    }),

  // ---------- materials & lots ----------
  getMaterials: () => request<Material[]>("/materials"),

  getMaterialLots: (materialId?: string) =>
    request<MaterialLot[]>(`/materials/lots${materialId ? `?materialId=${materialId}` : ""}`),

  // รับวัตถุดิบเข้าคลัง (สร้างล็อตใหม่)
  createMaterialLot: (body: CreateLotRequest) =>
    request<MaterialLot>("/materials/lots", { method: "POST", body: JSON.stringify(body) }),

  // ประวัติความเคลื่อนไหวของวัตถุดิบ (รับเข้า + ใช้ไป)
  getMaterialLedger: (materialId: string) =>
    request<MaterialLedger>(`/materials/${materialId}/ledger`),

  // เอาล็อตวัตถุดิบออกจาก WO
  removeWorkOrderMaterial: (woId: string, lotId: string) =>
    request<{ removed: boolean }>(`/work-orders/${woId}/materials/${lotId}`, { method: "DELETE" }),

  // ---------- work order creation & lifecycle ----------
  createWorkOrder: (body: CreateWorkOrderRequest) =>
    request<WorkOrder>("/work-orders", { method: "POST", body: JSON.stringify(body) }),

  getWorkOrderDetail: (id: string) => request<WorkOrderDetail>(`/work-orders/${id}`),

  setWorkOrderStatus: (id: string, status: string) =>
    request<WorkOrder>(`/work-orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // ผูกล็อตวัตถุดิบเพิ่มเข้า WO ที่มีอยู่แล้ว (ใช้เมื่อล็อตเดิมหมด)
  addWorkOrderMaterial: (woId: string, lotId: string, qtyReserved?: number) =>
    request<ReservedMaterial[]>(`/work-orders/${woId}/materials`, {
      method: "POST",
      body: JSON.stringify({ lotId, qtyReserved }),
    }),

  // ---------- QC recheck ----------
  findUnitBySerial: (serial: string) =>
    request<UnitLookup>(`/work-orders/units/${encodeURIComponent(serial)}`),

  rejectUnit: (woId: string, unitId: string, reason: string) =>
    request<{ unit: unknown; workOrder: WorkOrder }>(`/work-orders/${woId}/units/${unitId}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }),
};