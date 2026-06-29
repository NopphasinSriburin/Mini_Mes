// ============================================================
// types.ts — type ของข้อมูลที่รับจาก backend API
// แก้ไขให้ตรงกับ response จริงของ Express
// ============================================================

export type Role = "OPERATOR" | "TECHNICIAN" | "ENGINEER" | "ADMIN";

export type WorkOrderStatus =
  | "PLANNED" | "RELEASED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

export type MachineStatus = "RUNNING" | "IDLE" | "DOWN" | "MAINTENANCE";

export type QualityResult = "PASS" | "FAIL" | "REWORK";

export type MaintenanceType = "BREAKDOWN" | "PREVENTIVE";

export type MaintenanceStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";

// ---------- auth ----------
export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ---------- work orders ----------
export interface WorkOrder {
  id: string;
  wo_no: string;
  qty_target: number;
  qty_good: number;
  qty_defect: number;
  status: WorkOrderStatus;
  actual_start: string | null;
  actual_end: string | null;
  product_code: string;
  product_name: string;
}

// ---------- recording production ----------
export interface RecordUnitRequest {
  serialNo: string;
  machineId?: number;
  result: QualityResult;
}

export interface ProductionUnit {
  id: string;
  serial_no: string;
  result: QualityResult;
  produced_at: string;
}

// ---------- traceability ----------
export interface TraceMaterial {
  materialCode: string;
  materialName: string;
  lot: string;
  supplier: string;
  qtyUsed: string;
}

export interface UnitTrace {
  serialNo: string;
  product: { code: string; name: string };
  workOrder: string;
  machine: { code: string; name: string };
  operator: string;
  producedAt: string;
  result: QualityResult;
  materials: TraceMaterial[];
}

export interface LotTraceUnit {
  serialNo: string;
  workOrder: string;
  product: string;
  producedAt: string;
  result: QualityResult;
}

export interface LotTrace {
  lot: string;
  affectedCount: number;
  units: LotTraceUnit[];
}

// ---------- maintenance ----------
export interface MaintenanceOrder {
  id: string;
  mo_no: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  problem: string | null;
  reported_at: string;
  finished_at: string | null;
  downtime_min: number | null;
  machine_code: string;
  machine_name: string;
  reported_by: string | null;
  assigned_to: string | null;
}

// ---------- dashboard ----------
export interface DashboardSummary {
  workOrders: {
    in_progress: string;
    completed: string;
    total_good: string;
    total_defect: string;
  };
  machineStatus: { status: MachineStatus; count: number }[];
  openMaintenance: number;
  qualityYieldPct: number | null;
}