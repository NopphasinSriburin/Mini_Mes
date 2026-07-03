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
  product_id: string;
  product_code: string;
  product_name: string;
  machine_id: string | null;
  machine_code: string | null;
  machine_name: string | null;
}

export interface AvailableMachine {
  id: string;
  machine_code: string;
  name: string;
  line_name: string | null;
  status: MachineStatus;
}

// ---------- products & materials (BOM) ----------
export interface Product {
  id: string;
  product_code: string;
  name: string;
  unit: string;
}

export interface Material {
  id: string;
  material_code: string;
  name: string;
  unit: string;
}

export interface LedgerEntry {
  type: "IN" | "OUT";
  ts: string;
  lot_no: string;
  serial_no: string | null;
  wo_no: string | null;
  qty: string;
  ref: string | null; // supplier (IN) หรือ null (OUT)
}

export interface MaterialLedger {
  material: Material;
  totalRemaining: string;
  entries: LedgerEntry[];
}

export interface CreateLotRequest {
  materialId: string;
  lotNo: string;
  supplier?: string;
  qtyReceived: number;
}

export interface MaterialLot {
  id: string;
  lot_no: string;
  supplier: string;
  qty_received: string;
  qty_remaining: string;
  received_at: string;
  material_id: string;
  material_code: string;
  material_name: string;
  unit: string;
}

export interface BomItem {
  id: string;
  material_id: string;
  qty_per_unit: string;
  material_code: string;
  material_name: string;
  unit: string;
}

export interface BomItemInput {
  materialId: string;
  qtyPerUnit: number;
}

// ---------- work order creation ----------
export interface CreateWorkOrderRequest {
  woNo: string;
  productId: string;
  qtyTarget: number;
  machineId?: string;
  materials: { lotId: string; qtyReserved?: number }[];
}

export interface ReservedMaterial {
  material_lot_id: string;
  qty_reserved: string | null;
  lot_no: string;
  supplier: string;
  qty_remaining: string;
  material_code: string;
  material_name: string;
}

export interface WorkOrderDetailUnit {
  id: string;
  serial_no: string;
  result: QualityResult;
  produced_at: string;
  reject_reason: string | null;
  rejected_at: string | null;
  machine_code: string | null;
  operator: string | null;
}

export interface WorkOrderDetail extends WorkOrder {
  units: WorkOrderDetailUnit[];
  reservedMaterials: ReservedMaterial[];
}

// ---------- QC recheck ----------
export interface UnitLookup {
  id: string;
  serial_no: string;
  result: QualityResult;
  produced_at: string;
  reject_reason: string | null;
  rejected_at: string | null;
  work_order_id: string;
  wo_no: string;
  wo_status: WorkOrderStatus;
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

export interface Machine {
  id: string;
  machine_code: string;
  name: string;
  line_name: string | null;
  status: MachineStatus;
}

export interface CreateMaintenanceRequest {
  moNo: string;
  machineId: string;
  type: MaintenanceType;
  problem?: string;
}

export interface CloseMaintenanceRequest {
  actionTaken?: string;
  downtimeMin?: number;
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
export interface DashboardWorkOrderBrief {
  id: string;
  wo_no: string;
  qty_target: number;
  qty_good: number;
  qty_defect: number;
  product_name: string;
}

export interface LowStockLot {
  id: string;
  lot_no: string;
  qty_remaining: string;
  qty_received: string;
  material_name: string;
  wo_no: string;
}

export interface DownMachine {
  machine_code: string;
  machine_name: string;
  mo_no: string | null;
  problem: string | null;
}

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
  inProgressOrders: DashboardWorkOrderBrief[];
  lowStockLots: LowStockLot[];
  downMachines: DownMachine[];
}