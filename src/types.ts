export type UserRole = 'admin' | 'nhap' | 'xem';

export interface PinAccount {
  id: string;
  pin: string; // 4 chữ số
  name: string;
  role: UserRole; // 'admin' = Quản trị viên, 'nhap' = Chỉ nhập, 'xem' = Chỉ xem
  created_at: string;
}

export type UserProfile = PinAccount;

export interface Product {
  id: string;
  name: string;
  size: string;
  conversion_coefficient: number;
  created_at: string;
}

export interface ImportRecord {
  id: string;
  product_id: string;
  import_date: string;
  so_luot: number;
  total_m3: number;
  created_at: string;
  created_by?: string; // Tên nhân sự nhập
  products?: Product;
}

export interface ExportRecord {
  id: string;
  product_id: string;
  export_date: string;
  so_luot: number;
  total_m3: number;
  unit_price: number;
  revenue: number;
  note?: string;
  created_at: string;
  created_by?: string; // Tên nhân sự xuất
  products?: Product;
}

export interface MonthlyReport {
  id: string;
  year: number;
  month: number;
  total_import_m3: number;
  total_export_m3: number;
  total_revenue: number;
  cost_goods: number;
  cost_labor: number;
  cost_electricity: number;
  cost_capital: number;
  cost_other: number;
  total_cost: number;
  profit: number;
  finalized: boolean; // true = Đã xuất bản
  published_at?: string;
  published_by?: string;
  note?: string;
  created_at: string;
  updated_at?: string;
}

export interface InventoryItem {
  product_id: string;
  product_name: string;
  product_size: string;
  conversion_coefficient: number;
  total_import_m3: number;
  total_export_m3: number;
  remaining_m3: number;
}

export type AuditActionType = 'create' | 'update' | 'delete' | 'finalize';
export type AuditModule = 'import' | 'export' | 'product' | 'report' | 'pin';

export interface AuditLog {
  id: string;
  created_at: string;
  user_name: string;
  user_pin: string;
  user_role: UserRole;
  module: AuditModule;
  action: AuditActionType;
  title: string;
  summary: string;
  details?: Record<string, any>;
}

export interface SheetData {
  name: string;
  data: Record<string, any>[];
}
