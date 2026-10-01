import {
  Product,
  ImportRecord,
  ExportRecord,
  MonthlyReport,
  PinAccount,
  UserRole,
  AuditLog,
  AuditModule,
  AuditActionType,
} from '../types';
import { formatM3, formatVND } from '../utils/formatters';
import { db, handleFirestoreError, OperationType, testConnection } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';

export interface CloudSyncStatus {
  connected: boolean;
  lastSynced: string | null;
  syncing: boolean;
  productsCount: number;
  importsCount: number;
  exportsCount: number;
  reportsCount: number;
  pinsCount: number;
  auditLogsCount: number;
  error?: string | null;
}

/**
 * Recursively removes any keys with `undefined` values so Firestore setDoc does not throw:
 * "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function cleanForFirestore<T = any>(obj: T): any {
  if (obj === undefined) {
    return null;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item));
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      cleaned[key] = cleanForFirestore(value);
    }
  }
  return cleaned;
}

const STORAGE_KEYS = {
  PRODUCTS: 'ht_inventory_products',
  IMPORTS: 'ht_inventory_imports',
  EXPORTS: 'ht_inventory_exports',
  REPORTS: 'ht_inventory_reports',
  USERS: 'ht_inventory_pin_accounts_v3',
  CURRENT_USER: 'ht_inventory_current_pin_user_v3',
  AUDIT_LOGS: 'ht_inventory_audit_logs_v3',
};

// Realistic seed data for CÔNG TY TNHH HƯNG THỊNH CQT
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'G2.5',
    size: '2.5 cm',
    conversion_coefficient: 0.05,
    created_at: '2026-09-18T00:00:00.000Z',
  },
  {
    id: 'prod-2',
    name: 'G01.5',
    size: '1.5cm',
    conversion_coefficient: 0.03,
    created_at: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'prod-3',
    name: 'G02',
    size: '2 cm',
    conversion_coefficient: 0.04,
    created_at: '2026-01-12T09:30:00.000Z',
  },
  {
    id: 'prod-4',
    name: 'G03',
    size: '3 cm',
    conversion_coefficient: 0.06,
    created_at: '2026-01-15T14:15:00.000Z',
  },
  {
    id: 'prod-5',
    name: 'G04',
    size: '4 cm',
    conversion_coefficient: 0.08,
    created_at: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'prod-6',
    name: 'G06',
    size: '6 cm',
    conversion_coefficient: 0.12,
    created_at: '2026-02-10T11:00:00.000Z',
  },
];

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

function pad(n: number) {
  return n < 10 ? '0' + n : '' + n;
}

const INITIAL_IMPORTS: ImportRecord[] = [];
const INITIAL_EXPORTS: ExportRecord[] = [];
const INITIAL_REPORTS: MonthlyReport[] = [];

const INITIAL_PINS: PinAccount[] = [
  {
    id: 'pin-1',
    pin: '1111',
    name: 'Quản trị viên (Admin)',
    role: 'admin',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'pin-2',
    pin: '6868',
    name: 'Nhân viên nhập hàng',
    role: 'nhap',
    created_at: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'pin-3',
    pin: '2222',
    name: 'Ban Giám Đốc / Kiểm Soát',
    role: 'xem',
    created_at: '2026-01-05T08:00:00.000Z',
  },
  {
    id: 'pin-4',
    pin: '7979',
    name: 'Kế toán đối soát công nợ',
    role: 'xem',
    created_at: '2026-01-12T10:00:00.000Z',
  },
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-init',
    created_at: new Date().toISOString(),
    user_name: 'Hệ thống',
    user_pin: '1111',
    user_role: 'admin',
    module: 'report',
    action: 'delete',
    title: 'Khởi tạo hệ thống dữ liệu trắng',
    summary: 'Dữ liệu xuất nhập và báo cáo doanh thu đã được thiết lập về trang trắng sẵn sàng vận hành thực tế.',
  },
];

export class StorageService {
  private static isInitialized = false;
  private static isInitializing = false;
  private static memoryStore: Record<string, string> = {};
  private static firestoreListenersActive = false;
  private static syncStatus: CloudSyncStatus = {
    connected: false,
    lastSynced: null,
    syncing: false,
    productsCount: 0,
    importsCount: 0,
    exportsCount: 0,
    reportsCount: 0,
    pinsCount: 0,
    auditLogsCount: 0,
    error: null,
  };

  static getCloudSyncStatus(): CloudSyncStatus {
    return { ...this.syncStatus };
  }

  static async setupFirestoreSync() {
    if (this.firestoreListenersActive) return;
    this.firestoreListenersActive = true;
    this.syncStatus.syncing = true;

    // Ping Firestore in background without blocking snapshot listeners
    testConnection()
      .then((connected) => {
        this.syncStatus.connected = connected;
        if (connected) {
          this.syncStatus.error = null;
        }
      })
      .catch((e) => {
        console.warn('Firestore connection check warning:', e);
      });

    // 1. Products onSnapshot
    try {
      onSnapshot(
        collection(db, 'products'),
        (snapshot) => {
          this.syncStatus.connected = true;
          this.syncStatus.lastSynced = new Date().toISOString();
          this.syncStatus.productsCount = snapshot.size;

          if (snapshot.empty) {
            const local = this.get<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
            local.forEach((p) => {
              setDoc(doc(db, 'products', p.id), cleanForFirestore(p)).catch((err) =>
                console.warn('Initial product seed warning:', err)
              );
            });
          } else {
            const cloudProducts = snapshot.docs.map((d) => d.data() as Product);
            // Ensure core standard products are always present
            const prodMap = new Map<string, Product>();
            INITIAL_PRODUCTS.forEach((p) => prodMap.set(p.id, p));
            cloudProducts.forEach((p) => prodMap.set(p.id, p));
            const mergedProducts = Array.from(prodMap.values());
            this.set(STORAGE_KEYS.PRODUCTS, mergedProducts);
          }
        },
        (error) => {
          this.syncStatus.error = error.message;
          console.warn('Products onSnapshot warning:', error);
        }
      );
    } catch (err) {
      console.error('Failed to attach products listener', err);
    }

    // 2. Imports onSnapshot
    try {
      onSnapshot(
        collection(db, 'imports'),
        (snapshot) => {
          this.syncStatus.connected = true;
          this.syncStatus.lastSynced = new Date().toISOString();
          this.syncStatus.importsCount = snapshot.size;

          const cloudImports = snapshot.docs.map((d) => d.data() as ImportRecord);
          this.set(STORAGE_KEYS.IMPORTS, cloudImports);
        },
        (error) => {
          this.syncStatus.error = error.message;
          console.warn('Imports onSnapshot warning:', error);
        }
      );
    } catch (err) {
      console.error('Failed to attach imports listener', err);
    }

    // 3. Exports onSnapshot
    try {
      onSnapshot(
        collection(db, 'exports'),
        (snapshot) => {
          this.syncStatus.connected = true;
          this.syncStatus.lastSynced = new Date().toISOString();
          this.syncStatus.exportsCount = snapshot.size;

          const cloudExports = snapshot.docs.map((d) => d.data() as ExportRecord);
          this.set(STORAGE_KEYS.EXPORTS, cloudExports);
        },
        (error) => {
          this.syncStatus.error = error.message;
          console.warn('Exports onSnapshot warning:', error);
        }
      );
    } catch (err) {
      console.error('Failed to attach exports listener', err);
    }

    // 4. Monthly Reports onSnapshot
    try {
      onSnapshot(
        collection(db, 'monthly_reports'),
        (snapshot) => {
          this.syncStatus.connected = true;
          this.syncStatus.lastSynced = new Date().toISOString();
          this.syncStatus.reportsCount = snapshot.size;

          const cloudReports = snapshot.docs.map((d) => d.data() as MonthlyReport);
          this.set(STORAGE_KEYS.REPORTS, cloudReports);
        },
        (error) => {
          this.syncStatus.error = error.message;
          console.warn('Monthly reports onSnapshot warning:', error);
        }
      );
    } catch (err) {
      console.error('Failed to attach reports listener', err);
    }

    // 5. Pin Accounts onSnapshot
    try {
      onSnapshot(
        collection(db, 'pin_accounts'),
        (snapshot) => {
          this.syncStatus.connected = true;
          this.syncStatus.lastSynced = new Date().toISOString();
          this.syncStatus.pinsCount = snapshot.size;

          if (snapshot.empty) {
            const local = this.get<PinAccount[]>(STORAGE_KEYS.USERS, INITIAL_PINS);
            local.forEach((acc) => {
              setDoc(doc(db, 'pin_accounts', acc.id), cleanForFirestore(acc)).catch((err) =>
                console.warn('Initial PIN seed warning:', err)
              );
            });
          } else {
            const cloudPins = snapshot.docs.map((d) => d.data() as PinAccount);
            this.set(STORAGE_KEYS.USERS, cloudPins);

            // Synchronize active session if credentials changed in cloud
            const currentUser = this.getCurrentUser();
            if (currentUser) {
              const matched = cloudPins.find((p) => p.id === currentUser.id);
              if (matched && (matched.pin !== currentUser.pin || matched.name !== currentUser.name || matched.role !== currentUser.role)) {
                this.setCurrentUser(matched);
              }
            }
          }
        },
        (error) => {
          this.syncStatus.error = error.message;
          console.warn('Pin accounts onSnapshot warning:', error);
        }
      );
    } catch (err) {
      console.error('Failed to attach pin_accounts listener', err);
    }

    // 6. Audit Logs onSnapshot
    try {
      onSnapshot(
        collection(db, 'audit_logs'),
        (snapshot) => {
          this.syncStatus.connected = true;
          this.syncStatus.lastSynced = new Date().toISOString();
          this.syncStatus.auditLogsCount = snapshot.size;

          const cloudLogs = snapshot.docs.map((d) => d.data() as AuditLog);
          cloudLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          this.set(STORAGE_KEYS.AUDIT_LOGS, cloudLogs);
        },
        (error) => {
          this.syncStatus.error = error.message;
          console.warn('Audit logs onSnapshot warning:', error);
        }
      );
    } catch (err) {
      console.error('Failed to attach audit_logs listener', err);
    } finally {
      this.syncStatus.syncing = false;
    }
  }

  static async forceSyncAllToCloud(): Promise<{ success: boolean; message: string }> {
    try {
      this.syncStatus.syncing = true;
      const products = this.getProducts();
      const imports = this.get<ImportRecord[]>(STORAGE_KEYS.IMPORTS, []);
      const exports = this.get<ExportRecord[]>(STORAGE_KEYS.EXPORTS, []);
      const reports = this.getMonthlyReports();
      const accounts = this.getPinAccounts();
      const auditLogs = this.getAuditLogs();

      for (const p of products) {
        await setDoc(doc(db, 'products', p.id), cleanForFirestore(p));
      }
      for (const imp of imports) {
        const { products: _, ...clean } = imp;
        await setDoc(doc(db, 'imports', clean.id), cleanForFirestore(clean));
      }
      for (const exp of exports) {
        const { products: _, ...clean } = exp;
        await setDoc(doc(db, 'exports', clean.id), cleanForFirestore(clean));
      }
      for (const rep of reports) {
        await setDoc(doc(db, 'monthly_reports', rep.id), cleanForFirestore(rep));
      }
      for (const acc of accounts) {
        await setDoc(doc(db, 'pin_accounts', acc.id), cleanForFirestore(acc));
      }
      for (const log of auditLogs) {
        await setDoc(doc(db, 'audit_logs', log.id), cleanForFirestore(log));
      }

      this.syncStatus.connected = true;
      this.syncStatus.lastSynced = new Date().toISOString();
      this.syncStatus.productsCount = products.length;
      this.syncStatus.importsCount = imports.length;
      this.syncStatus.exportsCount = exports.length;
      this.syncStatus.reportsCount = reports.length;
      this.syncStatus.pinsCount = accounts.length;
      this.syncStatus.auditLogsCount = auditLogs.length;

      return {
        success: true,
        message: `Đã đồng bộ thành công ${products.length} sản phẩm, ${imports.length} phiếu nhập, ${exports.length} phiếu xuất, ${reports.length} báo cáo, ${accounts.length} tài khoản lên Cloud Firestore.`,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'force_sync');
      return {
        success: false,
        message: 'Lỗi khi đồng bộ lên Cloud: ' + (error instanceof Error ? error.message : String(error)),
      };
    } finally {
      this.syncStatus.syncing = false;
    }
  }

  static exportFullBackupJSON(): string {
    const backup = {
      app: 'HƯNG THỊNH CQT - Quản lý kho & Báo cáo tài chính',
      exported_at: new Date().toISOString(),
      products: this.getProducts(),
      imports: this.get<ImportRecord[]>(STORAGE_KEYS.IMPORTS, []),
      exports: this.get<ExportRecord[]>(STORAGE_KEYS.EXPORTS, []),
      reports: this.getMonthlyReports(),
      users: this.getPinAccounts(),
      audit_logs: this.getAuditLogs(),
    };
    return JSON.stringify(backup, null, 2);
  }

  static async importFullBackupJSON(jsonStr: string): Promise<{ success: boolean; message: string }> {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.products)) {
        this.set(STORAGE_KEYS.PRODUCTS, data.products);
      }
      if (Array.isArray(data.imports)) {
        this.set(STORAGE_KEYS.IMPORTS, data.imports);
      }
      if (Array.isArray(data.exports)) {
        this.set(STORAGE_KEYS.EXPORTS, data.exports);
      }
      if (Array.isArray(data.reports)) {
        this.set(STORAGE_KEYS.REPORTS, data.reports);
      }
      if (Array.isArray(data.users)) {
        this.set(STORAGE_KEYS.USERS, data.users);
      }
      if (Array.isArray(data.audit_logs)) {
        this.set(STORAGE_KEYS.AUDIT_LOGS, data.audit_logs);
      }

      await this.forceSyncAllToCloud();
      return { success: true, message: 'Nhập dữ liệu dự phòng và đồng bộ lên Cloud thành công!' };
    } catch (e) {
      return { success: false, message: 'Tệp sao lưu không hợp lệ: ' + (e instanceof Error ? e.message : String(e)) };
    }
  }

  private static get<T>(key: string, defaultValue: T): T {
    try {
      let data: string | null = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        data = window.localStorage.getItem(key);
      }
      if (!data && typeof window !== 'undefined' && window.sessionStorage) {
        data = window.sessionStorage.getItem(key);
      }
      if (!data && this.memoryStore[key]) {
        data = this.memoryStore[key];
      }
      if (!data) return defaultValue;
      return JSON.parse(data);
    } catch {
      if (this.memoryStore[key]) {
        try {
          return JSON.parse(this.memoryStore[key]);
        } catch {
          return defaultValue;
        }
      }
      return defaultValue;
    }
  }

  private static set<T>(key: string, value: T, notify = true): void {
    const json = JSON.stringify(value);
    this.memoryStore[key] = json;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, json);
      }
    } catch (e) {
      console.warn('LocalStorage save error, preserved in memory and session:', e);
    }
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, json);
      }
    } catch {
      // ignore
    }
    if (notify && typeof window !== 'undefined') {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('app-storage-changed', { detail: { key } }));
      }, 0);
    }
  }

  static init() {
    if (this.isInitialized || this.isInitializing) return;
    this.isInitializing = true;
    try {
      // 1. Products - only initialize if key is completely absent (null or undefined)
      const currentProducts = this.get<Product[] | null>(STORAGE_KEYS.PRODUCTS, null);
      if (currentProducts === null || currentProducts === undefined) {
        this.set(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS, false);
      }

      // 2. Imports - only initialize if key is completely absent (null or undefined)
      const currentImports = this.get<ImportRecord[] | null>(STORAGE_KEYS.IMPORTS, null);
      if (currentImports === null || currentImports === undefined) {
        this.set(STORAGE_KEYS.IMPORTS, INITIAL_IMPORTS, false);
      }

      // 3. Exports - only initialize if key is completely absent (null or undefined)
      const currentExports = this.get<ExportRecord[] | null>(STORAGE_KEYS.EXPORTS, null);
      if (currentExports === null || currentExports === undefined) {
        this.set(STORAGE_KEYS.EXPORTS, INITIAL_EXPORTS, false);
      }

      // 4. Reports - only initialize if key is completely absent (null or undefined)
      const currentReports = this.get<MonthlyReport[] | null>(STORAGE_KEYS.REPORTS, null);
      if (currentReports === null || currentReports === undefined) {
        this.set(STORAGE_KEYS.REPORTS, INITIAL_REPORTS, false);
      }

      // 5. Users - only initialize if key is completely absent (null or undefined)
      const currentUsers = this.get<PinAccount[] | null>(STORAGE_KEYS.USERS, null);
      if (currentUsers === null || currentUsers === undefined) {
        this.set(STORAGE_KEYS.USERS, INITIAL_PINS, false);
      }

      // 6. Audit Logs - only initialize if key is completely absent (null or undefined)
      const currentLogs = this.get<AuditLog[] | null>(STORAGE_KEYS.AUDIT_LOGS, null);
      if (currentLogs === null || currentLogs === undefined) {
        this.set(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS, false);
      }

      // 7. Active session - do not auto-login so visiting the app presents the Login page first
      // Session is preserved in sessionStorage once logged in.

      if (!this.firestoreListenersActive && typeof window !== 'undefined') {
        this.setupFirestoreSync();
      }

      this.isInitialized = true;
    } finally {
      this.isInitializing = false;
    }
  }

  // Audit Logs
  static getAuditLogs(): AuditLog[] {
    this.init();
    const logs = this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static addAuditLog(entry: {
    module: AuditModule;
    action: AuditActionType;
    title: string;
    summary: string;
    details?: Record<string, any>;
  }): AuditLog {
    this.init();
    const current = this.getCurrentUser();
    const logs = this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);

    const newLog: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      created_at: new Date().toISOString(),
      user_name: current?.name || 'Quản trị viên',
      user_pin: current?.pin || '1111',
      user_role: current?.role || 'admin',
      module: entry.module,
      action: entry.action,
      title: entry.title,
      summary: entry.summary,
      ...(entry.details !== undefined ? { details: entry.details } : {}),
    };

    logs.unshift(newLog);
    if (logs.length > 500) logs.length = 500;
    this.set(STORAGE_KEYS.AUDIT_LOGS, logs);

    const docPayload = cleanForFirestore(newLog);
    setDoc(doc(db, 'audit_logs', newLog.id), docPayload).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `audit_logs/${newLog.id}`)
    );

    return newLog;
  }

  // Products
  static getProducts(): Product[] {
    this.init();
    return this.get<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  }

  static async saveProduct(product: Omit<Product, 'id' | 'created_at'> & { id?: string }): Promise<Product> {
    const products = this.getProducts();
    if (product.id) {
      const idx = products.findIndex((p) => p.id === product.id);
      if (idx !== -1) {
        const updated = {
          ...products[idx],
          name: product.name,
          size: product.size,
          conversion_coefficient: product.conversion_coefficient,
        };
        products[idx] = updated;
        this.set(STORAGE_KEYS.PRODUCTS, products);

        // Also synchronize imports if coefficient changed
        const imports = this.get<ImportRecord[]>(STORAGE_KEYS.IMPORTS, []);
        let impChanged = false;
        const syncedImports = imports.map((imp) => {
          if (imp.product_id === updated.id) {
            impChanged = true;
            return {
              ...imp,
              total_m3: (imp.so_luot || 0) * updated.conversion_coefficient,
            };
          }
          return imp;
        });
        if (impChanged) {
          this.set(STORAGE_KEYS.IMPORTS, syncedImports);
        }

        // Synchronize exports if coefficient changed
        const exports = this.get<ExportRecord[]>(STORAGE_KEYS.EXPORTS, []);
        let expChanged = false;
        const syncedExports = exports.map((exp) => {
          if (exp.product_id === updated.id) {
            expChanged = true;
            const newM3 = (exp.so_luot || 0) * updated.conversion_coefficient;
            return {
              ...exp,
              total_m3: newM3,
              revenue: newM3 * (exp.unit_price || 0),
            };
          }
          return exp;
        });
        if (expChanged) {
          this.set(STORAGE_KEYS.EXPORTS, syncedExports);
        }

        this.addAuditLog({
          module: 'product',
          action: 'update',
          title: 'Sửa sản phẩm',
          summary: `${updated.name} • Quy cách: ${updated.size || 'Tiêu chuẩn'} • Hệ số: ${updated.conversion_coefficient}`,
        });

        try {
          await setDoc(doc(db, 'products', updated.id), cleanForFirestore(updated));
          this.syncStatus.lastSynced = new Date().toISOString();
          this.syncStatus.connected = true;
          this.syncStatus.error = null;
        } catch (err) {
          console.warn('Failed to sync product to Cloud Firestore:', err);
          this.syncStatus.error = 'Chưa đồng bộ lên Cloud: ' + (err instanceof Error ? err.message : String(err));
        }

        return updated;
      }
    }
    const newProduct: Product = {
      id: 'prod-' + Date.now(),
      name: product.name,
      size: product.size,
      conversion_coefficient: product.conversion_coefficient,
      created_at: new Date().toISOString(),
    };
    products.unshift(newProduct);
    this.set(STORAGE_KEYS.PRODUCTS, products);

    this.addAuditLog({
      module: 'product',
      action: 'create',
      title: 'Thêm sản phẩm mới',
      summary: `${newProduct.name} • Quy cách: ${newProduct.size || 'Tiêu chuẩn'} • Hệ số: ${newProduct.conversion_coefficient}`,
    });

    try {
      await setDoc(doc(db, 'products', newProduct.id), cleanForFirestore(newProduct));
      this.syncStatus.lastSynced = new Date().toISOString();
      this.syncStatus.connected = true;
      this.syncStatus.error = null;
    } catch (err) {
      console.warn('Failed to sync new product to Cloud Firestore:', err);
      this.syncStatus.error = 'Chưa đồng bộ lên Cloud: ' + (err instanceof Error ? err.message : String(err));
    }

    return newProduct;
  }

  static async deleteProduct(id: string): Promise<void> {
    const products = this.getProducts();
    const target = products.find((p) => p.id === id);
    const filtered = products.filter((p) => p.id !== id);
    this.set(STORAGE_KEYS.PRODUCTS, filtered);

    try {
      await deleteDoc(doc(db, 'products', id));
      this.syncStatus.lastSynced = new Date().toISOString();
    } catch (err) {
      console.warn('Failed to delete product from Cloud Firestore:', err);
    }

    if (target) {
      this.addAuditLog({
        module: 'product',
        action: 'delete',
        title: 'Xóa sản phẩm',
        summary: `${target.name} (${target.size || 'Tiêu chuẩn'})`,
      });
    }
  }

  static resetProductsToDefault(): void {
    this.set(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    this.addAuditLog({
      module: 'product',
      action: 'update',
      title: 'Khôi phục danh mục sản phẩm chuẩn theo bảng quy cách',
      summary: 'Đồng bộ lại 6 sản phẩm: G2.5, G01.5, G02, G03, G04, G06',
    });
  }

  // Imports
  static getImports(): ImportRecord[] {
    this.init();
    const imports = this.get<ImportRecord[]>(STORAGE_KEYS.IMPORTS, []);
    const products = this.getProducts();
    const prodMap = new Map(products.map((p) => [p.id, p]));
    return imports.map((imp) => ({
      ...imp,
      products: prodMap.get(imp.product_id),
    }));
  }

  static async saveImport(record: {
    id?: string;
    product_id: string;
    import_date: string;
    so_luot: number;
  }): Promise<ImportRecord> {
    const imports = this.getImports();
    const products = this.getProducts();
    const prod = products.find((p) => p.id === record.product_id);
    const total_m3 = (record.so_luot || 0) * (prod?.conversion_coefficient || 0);
    const currentUser = this.getCurrentUser();

    if (record.id) {
      const idx = imports.findIndex((i) => i.id === record.id);
      if (idx !== -1) {
        const updated: ImportRecord = {
          ...imports[idx],
          product_id: record.product_id,
          import_date: record.import_date,
          so_luot: record.so_luot,
          total_m3: total_m3,
        };
        imports[idx] = updated;
        this.set(
          STORAGE_KEYS.IMPORTS,
          imports.map(({ products: _, ...rest }) => rest)
        );

        this.addAuditLog({
          module: 'import',
          action: 'update',
          title: 'Sửa phiếu nhập kho',
          summary: `${prod?.name || 'Sản phẩm'} • ${updated.so_luot} lượt (${formatM3(total_m3, 3)} m³)`,
        });

        const { products: _, ...cleanUpdated } = updated;
        try {
          await setDoc(doc(db, 'imports', cleanUpdated.id), cleanForFirestore(cleanUpdated));
          this.syncStatus.lastSynced = new Date().toISOString();
          this.syncStatus.connected = true;
          this.syncStatus.error = null;
        } catch (err) {
          console.warn('Failed to sync import update to Cloud Firestore:', err);
          this.syncStatus.error = 'Chưa đồng bộ lên Cloud: ' + (err instanceof Error ? err.message : String(err));
        }

        return { ...updated, products: prod };
      }
    }

    const newImport: ImportRecord = {
      id: 'imp-' + Date.now(),
      product_id: record.product_id,
      import_date: record.import_date,
      so_luot: record.so_luot,
      total_m3: total_m3,
      created_at: new Date().toISOString(),
      created_by: currentUser?.name || 'Nhân sự nhập',
    };
    imports.unshift(newImport);
    this.set(
      STORAGE_KEYS.IMPORTS,
      imports.map(({ products: _, ...rest }) => rest)
    );

    this.addAuditLog({
      module: 'import',
      action: 'create',
      title: 'Thêm phiếu nhập kho',
      summary: `${prod?.name || 'Sản phẩm'} • ${newImport.so_luot} lượt (${formatM3(total_m3, 3)} m³)`,
    });

    const { products: _, ...cleanNew } = newImport;
    try {
      await setDoc(doc(db, 'imports', cleanNew.id), cleanForFirestore(cleanNew));
      this.syncStatus.lastSynced = new Date().toISOString();
      this.syncStatus.connected = true;
      this.syncStatus.error = null;
    } catch (err) {
      console.warn('Failed to sync new import to Cloud Firestore:', err);
      this.syncStatus.error = 'Chưa đồng bộ lên Cloud: ' + (err instanceof Error ? err.message : String(err));
    }

    return { ...newImport, products: prod };
  }

  static async deleteImport(id: string): Promise<void> {
    const imports = this.getImports();
    const target = imports.find((i) => i.id === id);
    const filtered = imports.filter((i) => i.id !== id);
    this.set(
      STORAGE_KEYS.IMPORTS,
      filtered.map(({ products: _, ...rest }) => rest)
    );

    try {
      await deleteDoc(doc(db, 'imports', id));
      this.syncStatus.lastSynced = new Date().toISOString();
    } catch (err) {
      console.warn('Failed to delete import from Cloud Firestore:', err);
    }

    if (target) {
      this.addAuditLog({
        module: 'import',
        action: 'delete',
        title: 'Xóa phiếu nhập kho',
        summary: `${target.products?.name || 'Sản phẩm'} • ${target.so_luot} lượt (${formatM3(target.total_m3, 3)} m³)`,
      });
    }
  }

  // Exports
  static getExports(): ExportRecord[] {
    this.init();
    const exports = this.get<ExportRecord[]>(STORAGE_KEYS.EXPORTS, []);
    const products = this.getProducts();
    const prodMap = new Map(products.map((p) => [p.id, p]));
    return exports.map((exp) => ({
      ...exp,
      products: prodMap.get(exp.product_id),
    }));
  }

  static async saveExport(record: {
    id?: string;
    product_id: string;
    export_date: string;
    so_luot: number;
    unit_price: number;
    note?: string;
  }): Promise<ExportRecord> {
    const exports = this.getExports();
    const products = this.getProducts();
    const prod = products.find((p) => p.id === record.product_id);
    const total_m3 = (record.so_luot || 0) * (prod?.conversion_coefficient || 0);
    const revenue = total_m3 * (record.unit_price || 0);
    const currentUser = this.getCurrentUser();

    if (record.id) {
      const idx = exports.findIndex((e) => e.id === record.id);
      if (idx !== -1) {
        const updated: ExportRecord = {
          ...exports[idx],
          product_id: record.product_id,
          export_date: record.export_date,
          so_luot: record.so_luot,
          unit_price: record.unit_price,
          total_m3: total_m3,
          revenue: revenue,
          note: record.note,
        };
        exports[idx] = updated;
        this.set(
          STORAGE_KEYS.EXPORTS,
          exports.map(({ products: _, ...rest }) => rest)
        );

        this.addAuditLog({
          module: 'export',
          action: 'update',
          title: 'Sửa phiếu xuất kho',
          summary: `${prod?.name || 'Sản phẩm'} • ${updated.so_luot} lượt (${formatM3(total_m3, 3)} m³) • Doanh thu ${formatVND(revenue)}`,
        });

        const { products: _, ...cleanUpdated } = updated;
        try {
          await setDoc(doc(db, 'exports', cleanUpdated.id), cleanForFirestore(cleanUpdated));
          this.syncStatus.lastSynced = new Date().toISOString();
          this.syncStatus.connected = true;
          this.syncStatus.error = null;
        } catch (err) {
          console.warn('Failed to sync export update to Cloud Firestore:', err);
          this.syncStatus.error = 'Chưa đồng bộ lên Cloud: ' + (err instanceof Error ? err.message : String(err));
        }

        return { ...updated, products: prod };
      }
    }

    const newExport: ExportRecord = {
      id: 'exp-' + Date.now(),
      product_id: record.product_id,
      export_date: record.export_date,
      so_luot: record.so_luot,
      unit_price: record.unit_price,
      total_m3: total_m3,
      revenue: revenue,
      note: record.note,
      created_at: new Date().toISOString(),
      created_by: currentUser?.name || 'Nhân sự xuất',
    };
    exports.unshift(newExport);
    this.set(
      STORAGE_KEYS.EXPORTS,
      exports.map(({ products: _, ...rest }) => rest)
    );

    this.addAuditLog({
      module: 'export',
      action: 'create',
      title: 'Thêm phiếu xuất kho',
      summary: `${prod?.name || 'Sản phẩm'} • ${newExport.so_luot} lượt (${formatM3(total_m3, 3)} m³) • Doanh thu ${formatVND(revenue)}`,
    });

    const { products: _, ...cleanNew } = newExport;
    try {
      await setDoc(doc(db, 'exports', cleanNew.id), cleanForFirestore(cleanNew));
      this.syncStatus.lastSynced = new Date().toISOString();
      this.syncStatus.connected = true;
      this.syncStatus.error = null;
    } catch (err) {
      console.warn('Failed to sync new export to Cloud Firestore:', err);
      this.syncStatus.error = 'Chưa đồng bộ lên Cloud: ' + (err instanceof Error ? err.message : String(err));
    }

    return { ...newExport, products: prod };
  }

  static async deleteExport(id: string): Promise<void> {
    const exports = this.getExports();
    const target = exports.find((e) => e.id === id);
    const filtered = exports.filter((e) => e.id !== id);
    this.set(
      STORAGE_KEYS.EXPORTS,
      filtered.map(({ products: _, ...rest }) => rest)
    );

    try {
      await deleteDoc(doc(db, 'exports', id));
      this.syncStatus.lastSynced = new Date().toISOString();
    } catch (err) {
      console.warn('Failed to delete export from Cloud Firestore:', err);
    }

    if (target) {
      this.addAuditLog({
        module: 'export',
        action: 'delete',
        title: 'Xóa phiếu xuất kho',
        summary: `${target.products?.name || 'Sản phẩm'} • ${target.so_luot} lượt (${formatM3(target.total_m3, 3)} m³) • ${formatVND(target.revenue)}`,
      });
    }
  }

  // Monthly Reports
  static getMonthlyReports(): MonthlyReport[] {
    this.init();
    const reports = this.get<MonthlyReport[]>(STORAGE_KEYS.REPORTS, []);
    return reports.sort((a, b) => b.year - a.year || b.month - a.month);
  }

  static async saveMonthlyReport(data: Omit<MonthlyReport, 'id' | 'created_at'>): Promise<MonthlyReport> {
    const reports = this.getMonthlyReports();
    const existingIdx = reports.findIndex((r) => r.year === data.year && r.month === data.month);
    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    if (existingIdx !== -1) {
      const prev = reports[existingIdx];
      const updated: MonthlyReport = {
        ...prev,
        ...data,
        published_at: data.finalized ? (prev.published_at || now) : prev.published_at,
        published_by: data.finalized ? (currentUser?.name || 'Quản trị viên') : prev.published_by,
        updated_at: now,
      };
      reports[existingIdx] = updated;
      this.set(STORAGE_KEYS.REPORTS, reports);

      this.addAuditLog({
        module: 'report',
        action: data.finalized ? 'finalize' : 'update',
        title: data.finalized
          ? `Xuất bản báo cáo tháng ${data.month}/${data.year}`
          : `Lưu dự thảo báo cáo tháng ${data.month}/${data.year}`,
        summary: `Doanh thu: ${formatVND(data.total_revenue)} • Nhập: ${formatM3(data.total_import_m3, 2)} m³ • Xuất: ${formatM3(data.total_export_m3, 2)} m³ • Lợi nhuận: ${formatVND(data.profit)}`,
      });

      try {
        await setDoc(doc(db, 'monthly_reports', updated.id), cleanForFirestore(updated));
        this.syncStatus.lastSynced = new Date().toISOString();
        this.syncStatus.connected = true;
        this.syncStatus.error = null;
      } catch (err) {
        console.warn('Failed to sync monthly report to Cloud Firestore:', err);
        this.syncStatus.error = 'Chưa đồng bộ lên Cloud: ' + (err instanceof Error ? err.message : String(err));
      }

      return updated;
    }

    const newReport: MonthlyReport = {
      id: 'rep-' + Date.now(),
      ...data,
      published_at: data.finalized ? now : undefined,
      published_by: data.finalized ? (currentUser?.name || 'Quản trị viên') : undefined,
      created_at: now,
      updated_at: now,
    };
    reports.unshift(newReport);
    this.set(STORAGE_KEYS.REPORTS, reports);

    this.addAuditLog({
      module: 'report',
      action: data.finalized ? 'finalize' : 'create',
      title: data.finalized
        ? `Tạo & Xuất bản báo cáo tháng ${data.month}/${data.year}`
        : `Tạo dự thảo báo cáo tháng ${data.month}/${data.year}`,
      summary: `Doanh thu: ${formatVND(data.total_revenue)} • Nhập: ${formatM3(data.total_import_m3, 2)} m³ • Xuất: ${formatM3(data.total_export_m3, 2)} m³ • Lợi nhuận: ${formatVND(data.profit)}`,
    });

    try {
      await setDoc(doc(db, 'monthly_reports', newReport.id), cleanForFirestore(newReport));
      this.syncStatus.lastSynced = new Date().toISOString();
      this.syncStatus.connected = true;
      this.syncStatus.error = null;
    } catch (err) {
      console.warn('Failed to sync new monthly report to Cloud Firestore:', err);
      this.syncStatus.error = 'Chưa đồng bộ lên Cloud: ' + (err instanceof Error ? err.message : String(err));
    }

    return newReport;
  }

  static async deleteMonthlyReport(year: number, month: number): Promise<void> {
    const reports = this.getMonthlyReports();
    const target = reports.find((r) => r.year === year && r.month === month);
    const filtered = reports.filter((r) => !(r.year === year && r.month === month));
    this.set(STORAGE_KEYS.REPORTS, filtered);

    if (target) {
      try {
        await deleteDoc(doc(db, 'monthly_reports', target.id));
        this.syncStatus.lastSynced = new Date().toISOString();
      } catch (err) {
        console.warn('Failed to delete monthly report from Cloud Firestore:', err);
      }
    }

    this.addAuditLog({
      module: 'report',
      action: 'delete',
      title: `Xóa / Đặt lại báo cáo tháng ${month}/${year}`,
      summary: 'Khôi phục tính toán tự động từ phiếu nhập/xuất thực tế',
    });
  }

  static async deleteMonthlyReportById(id: string): Promise<void> {
    const reports = this.getMonthlyReports();
    const target = reports.find((r) => r.id === id);
    const filtered = reports.filter((r) => r.id !== id);
    this.set(STORAGE_KEYS.REPORTS, filtered);

    try {
      await deleteDoc(doc(db, 'monthly_reports', id));
      this.syncStatus.lastSynced = new Date().toISOString();
    } catch (err) {
      console.warn('Failed to delete monthly report from Cloud Firestore:', err);
    }

    if (target) {
      this.addAuditLog({
        module: 'report',
        action: 'delete',
        title: `Xóa báo cáo tháng ${target.month}/${target.year}`,
        summary: `Đã xóa báo cáo doanh thu ${formatVND(target.total_revenue)} • Lợi nhuận ${formatVND(target.profit)}`,
      });
    }
  }

  static clearAllMonthlyReports(): void {
    this.set(STORAGE_KEYS.REPORTS, []);
    this.addAuditLog({
      module: 'report',
      action: 'delete',
      title: 'Xóa toàn bộ dữ liệu báo cáo tài chính',
      summary: 'Khôi phục tính toán tự động toàn bộ theo phiếu kho thực tế',
    });
  }

  static async finalizeMonthlyReport(year: number, month: number): Promise<MonthlyReport | null> {
    const reports = this.getMonthlyReports();
    const existing = reports.find((r) => r.year === year && r.month === month);

    if (existing) {
      return await this.saveMonthlyReport({
        ...existing,
        finalized: true,
      });
    }

    const exports = this.getExports().filter((e) => {
      const d = new Date(e.export_date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    const imports = this.getImports().filter((i) => {
      const d = new Date(i.import_date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    const total_export_m3 = exports.reduce((sum, e) => sum + e.total_m3, 0);
    const total_import_m3 = imports.reduce((sum, i) => sum + i.total_m3, 0);
    const total_revenue = exports.reduce((sum, e) => sum + e.revenue, 0);

    return await this.saveMonthlyReport({
      year,
      month,
      total_import_m3,
      total_export_m3,
      total_revenue,
      cost_goods: 0,
      cost_labor: 0,
      cost_electricity: 0,
      cost_capital: 0,
      cost_other: 0,
      total_cost: 0,
      profit: total_revenue,
      finalized: true,
    });
  }

  // PIN Accounts & Authentication
  static getPinAccounts(): PinAccount[] {
    this.init();
    return this.get<PinAccount[]>(STORAGE_KEYS.USERS, INITIAL_PINS);
  }

  static getUsers(): PinAccount[] {
    return this.getPinAccounts();
  }

  static verifyPin(pin: string): PinAccount | null {
    const accounts = this.getPinAccounts();
    const clean = pin.trim();
    return accounts.find((a) => a.pin === clean) || null;
  }

  /**
   * Directly verify PIN against Cloud Firestore.
   * Crucial for Incognito mode or new devices when local storage is empty or snapshot has not yet arrived.
   */
  static async verifyPinFromCloud(pin: string): Promise<PinAccount | null> {
    const clean = pin.trim();
    try {
      const snap = await getDocs(collection(db, 'pin_accounts'));
      if (!snap.empty) {
        const cloudPins = snap.docs.map((d) => d.data() as PinAccount);
        this.set(STORAGE_KEYS.USERS, cloudPins);
        this.syncStatus.pinsCount = cloudPins.length;
        this.syncStatus.connected = true;
        const matched = cloudPins.find((a) => a.pin === clean);
        if (matched) return matched;
      }
    } catch (err) {
      console.warn('Direct Cloud Firestore pin check error:', err);
    }
    return this.verifyPin(clean);
  }

  static async savePinAccount(account: {
    id?: string;
    pin: string;
    name: string;
    role: UserRole;
  }): Promise<{ success: boolean; error?: string; data?: PinAccount }> {
    const accounts = this.getPinAccounts();
    const cleanPin = account.pin.trim();

    if (!/^\d{4}$/.test(cleanPin)) {
      return { success: false, error: 'Mã PIN phải bao gồm đúng 4 chữ số (0-9).' };
    }

    if (!account.name.trim()) {
      return { success: false, error: 'Vui lòng nhập tên người dùng hoặc bộ phận sử dụng.' };
    }

    const duplicate = accounts.find(
      (a) => a.pin === cleanPin && a.id !== account.id
    );
    if (duplicate) {
      return {
        success: false,
        error: `Mã PIN ${cleanPin} đã được gán cho "${duplicate.name}". Vui lòng chọn 4 số khác.`,
      };
    }

    const roleName =
      account.role === 'admin'
        ? 'Quản trị viên (Nhập/Sửa/Xóa)'
        : account.role === 'nhap'
        ? 'Chỉ nhập'
        : 'Chỉ xem';

    if (account.id) {
      const idx = accounts.findIndex((a) => a.id === account.id);
      if (idx !== -1) {
        const updated: PinAccount = {
          ...accounts[idx],
          pin: cleanPin,
          name: account.name.trim(),
          role: account.role,
        };
        accounts[idx] = updated;
        this.set(STORAGE_KEYS.USERS, accounts);

        // If updating the active logged in user's profile, update current session immediately
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === updated.id) {
          this.setCurrentUser(updated);
        }

        this.addAuditLog({
          module: 'pin',
          action: 'update',
          title: 'Cập nhật mã PIN & Quyền',
          summary: `Mã PIN ${cleanPin} - ${updated.name} • Quyền: ${roleName}`,
        });

        try {
          await setDoc(doc(db, 'pin_accounts', updated.id), cleanForFirestore(updated));
          this.syncStatus.lastSynced = new Date().toISOString();
          this.syncStatus.connected = true;
          this.syncStatus.error = null;
        } catch (err) {
          console.warn('Failed to sync updated pin to Cloud Firestore:', err);
          this.syncStatus.error = 'Chưa đồng bộ lên Cloud: ' + (err instanceof Error ? err.message : String(err));
        }

        return { success: true, data: updated };
      }
    }

    const newAcc: PinAccount = {
      id: 'pin-' + Date.now(),
      pin: cleanPin,
      name: account.name.trim(),
      role: account.role,
      created_at: new Date().toISOString(),
    };
    accounts.push(newAcc);
    this.set(STORAGE_KEYS.USERS, accounts);

    this.addAuditLog({
      module: 'pin',
      action: 'create',
      title: 'Cấp mã PIN mới',
      summary: `Mã PIN ${cleanPin} - ${newAcc.name} • Quyền: ${roleName}`,
    });

    try {
      await setDoc(doc(db, 'pin_accounts', newAcc.id), cleanForFirestore(newAcc));
      this.syncStatus.lastSynced = new Date().toISOString();
      this.syncStatus.connected = true;
      this.syncStatus.error = null;
    } catch (err) {
      console.warn('Failed to sync new pin account to Cloud Firestore:', err);
      this.syncStatus.error = 'Chưa đồng bộ lên Cloud: ' + (err instanceof Error ? err.message : String(err));
    }

    return { success: true, data: newAcc };
  }

  static async deletePinAccount(id: string): Promise<void> {
    const accounts = this.getPinAccounts();
    const target = accounts.find((a) => a.id === id);
    const filtered = accounts.filter((a) => a.id !== id);
    this.set(STORAGE_KEYS.USERS, filtered);

    try {
      await deleteDoc(doc(db, 'pin_accounts', id));
      this.syncStatus.lastSynced = new Date().toISOString();
    } catch (err) {
      console.warn('Failed to delete pin account from Cloud Firestore:', err);
    }

    if (target) {
      this.addAuditLog({
        module: 'pin',
        action: 'delete',
        title: 'Xóa mã PIN',
        summary: `Mã PIN ${target.pin} - ${target.name}`,
      });
    }
  }

  // Auth session: stored in sessionStorage so visiting the app starts at LoginPage first
  static getCurrentUser(): PinAccount | null {
    this.init();
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const session = window.sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (session) return JSON.parse(session);
      }
    } catch {
      // ignore
    }
    return null;
  }

  static setCurrentUser(user: PinAccount | null): void {
    try {
      if (typeof window !== 'undefined') {
        if (user) {
          if (window.sessionStorage) window.sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        } else {
          if (window.sessionStorage) window.sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          if (window.localStorage) window.localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
      }
    } catch {
      // ignore
    }
    this.set(STORAGE_KEYS.CURRENT_USER, user);
  }

  // Reset to blank state
  static resetData(): void {
    try {
      if (typeof window !== 'undefined') {
        if (window.localStorage) {
          localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
          localStorage.removeItem(STORAGE_KEYS.IMPORTS);
          localStorage.removeItem(STORAGE_KEYS.EXPORTS);
          localStorage.removeItem(STORAGE_KEYS.REPORTS);
          localStorage.removeItem(STORAGE_KEYS.USERS);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
        }
        if (window.sessionStorage) {
          sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
      }
    } catch {
      // ignore
    }
    this.memoryStore = {};
    this.isInitialized = false;
    this.init();
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('app-storage-changed', { detail: { key: '*' } }));
      }, 0);
    }
  }
}
