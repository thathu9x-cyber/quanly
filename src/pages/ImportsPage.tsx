import React, { useState, useEffect } from 'react';
import {
  ArrowDownToLine,
  Download,
  Plus,
  Search,
  Pencil,
  Trash2,
  Lock,
  Boxes,
  Layers,
  Clock,
  Package,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StorageService } from '../services/storage';
import { ImportRecord, Product } from '../types';
import { formatM3, formatDateTime, toInputDateTime, parseNumberInput } from '../utils/formatters';
import { exportToExcel } from '../utils/excel';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { EmptyState } from '../components/EmptyState';

export function ImportsPage() {
  const { canInput, isAdmin } = useAuth();
  const { show } = useToast();
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingImport, setEditingImport] = useState<ImportRecord | null>(null);
  const [deletingImport, setDeletingImport] = useState<ImportRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    product_id: '',
    import_date: toInputDateTime(),
    so_luot: '',
  });

  const loadData = () => {
    setLoading(true);
    const prodList = StorageService.getProducts();
    const impList = StorageService.getImports();
    setProducts(prodList);
    setImports(impList);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const handleStorageChange = () => {
      loadData();
    };
    window.addEventListener('app-storage-changed', handleStorageChange);
    return () => window.removeEventListener('app-storage-changed', handleStorageChange);
  }, []);

  const handleOpenAdd = () => {
    if (products.length === 0) {
      show('Vui lòng thêm sản phẩm trước khi tạo phiếu nhập', 'error');
      return;
    }
    setEditingImport(null);
    setFormData({
      product_id: products[0]?.id || '',
      import_date: toInputDateTime(),
      so_luot: '',
    });
    setModalOpen(true);
  };

  const canEdit = isAdmin || canInput;

  const handleOpenEdit = (imp: ImportRecord) => {
    if (!canEdit) {
      show('Tài khoản chỉ xem không có quyền sửa phiếu', 'error');
      return;
    }
    setEditingImport(imp);
    setFormData({
      product_id: imp.product_id,
      import_date: toInputDateTime(imp.import_date),
      so_luot: String(imp.so_luot),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!canInput) {
      show('Tài khoản chỉ xem không được tạo hoặc sửa phiếu', 'error');
      return;
    }

    const soLuotNum = parseNumberInput(formData.so_luot);
    if (soLuotNum <= 0) {
      show('Số lượt phải lớn hơn 0 (ví dụ: 10 hoặc 10,5)', 'error');
      return;
    }

    if (!formData.product_id) {
      show('Vui lòng chọn sản phẩm', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingImport) {
        if (!canEdit) {
          show('Tài khoản chỉ xem không được quyền chỉnh sửa', 'error');
          return;
        }
        await StorageService.saveImport({
          id: editingImport.id,
          product_id: formData.product_id,
          import_date: formData.import_date,
          so_luot: soLuotNum,
        });
        show('Đã cập nhật phiếu nhập và đồng bộ Cloud thành công', 'success');
      } else {
        await StorageService.saveImport({
          product_id: formData.product_id,
          import_date: formData.import_date,
          so_luot: soLuotNum,
        });
        show('Đã tạo phiếu nhập kho và đồng bộ Cloud thành công', 'success');
      }

      setModalOpen(false);
      setEditingImport(null);
      setFormData({
        product_id: products[0]?.id || '',
        import_date: toInputDateTime(),
        so_luot: '',
      });
      loadData();
    } catch (err) {
      console.error(err);
      show('Lỗi khi lưu phiếu nhập: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) {
      show('Chỉ Quản trị viên mới có quyền xóa phiếu', 'error');
      return;
    }
    if (!deletingImport) return;
    const id = deletingImport.id;
    setDeletingImport(null);
    try {
      await StorageService.deleteImport(id);
      show('Đã xóa phiếu nhập kho và đồng bộ Cloud', 'success');
      loadData();
    } catch (err) {
      show('Lỗi khi xóa phiếu: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  const filteredImports = imports.filter((imp) => {
    const prodName = imp.products?.name || '';
    const prodSize = imp.products?.size || '';
    const q = search.toLowerCase();
    return prodName.toLowerCase().includes(q) || prodSize.toLowerCase().includes(q);
  });

  // Calculate totals
  const totalCount = filteredImports.length;
  const totalLuot = filteredImports.reduce((sum, i) => sum + Number(i.so_luot || 0), 0);
  const totalM3 = filteredImports.reduce((sum, i) => sum + Number(i.total_m3 || 0), 0);

  // For live preview calculation in modal
  const selectedProd = products.find((p) => p.id === formData.product_id);
  const calculatedM3 =
    (parseNumberInput(formData.so_luot) || 0) * (selectedProd?.conversion_coefficient || 0);

  const handleExportExcel = () => {
    exportToExcel(
      [
        {
          name: 'Nhập kho',
          data: filteredImports.map((imp, idx) => ({
            STT: idx + 1,
            'Tên hàng': imp.products?.name || '',
            'Kích thước': imp.products?.size || '',
            'Ngày nhập': formatDateTime(imp.import_date),
            'Số lượt': Number(imp.so_luot),
            'Hệ số quy đổi': imp.products?.conversion_coefficient || 0,
            'Tổng m³': Number(imp.total_m3),
          })),
        },
      ],
      'Nhap_kho'
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Nhập kho</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Ghi nhận hàng nhập vào kho</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {imports.length > 0 && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-100 transition-colors shadow-sm"
            >
              <Download size={16} />
              <span>Xuất Excel</span>
            </button>
          )}

          {canInput ? (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20"
            >
              <Plus size={18} />
              <span>Thêm phiếu nhập</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-medium">
              <Lock size={15} />
              <span>Chỉ xem</span>
            </div>
          )}
        </div>
      </div>

      {/* 3 Summary Stats Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-sm font-medium text-slate-500 truncate">Tổng số phiếu</p>
          <p className="text-lg sm:text-2xl font-bold text-slate-800 mt-0.5">{formatM3(totalCount, 0)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-sm font-medium text-slate-500 truncate">Tổng số lượt</p>
          <p className="text-lg sm:text-2xl font-bold text-slate-800 mt-0.5">{formatM3(totalLuot, 0)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-sm font-medium text-slate-500 truncate">Tổng khối lượng</p>
          <p className="text-lg sm:text-2xl font-bold text-emerald-600 mt-0.5 truncate">
            {formatM3(totalM3)} <span className="text-xs sm:text-base font-medium">m³</span>
          </p>
        </div>
      </div>

      {/* Search Bar */}
      {imports.length > 0 && (
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên hoặc kích thước..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      )}

      {/* Content List: MOBILE (3 Thông tin cốt lõi) vs DESKTOP (Bảng đầy đủ) */}
      {filteredImports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={<ArrowDownToLine size={40} />}
            title={search ? 'Không tìm thấy phiếu nhập' : 'Chưa có phiếu nhập kho nào'}
            description={
              search ? 'Thử từ khóa khác' : 'Tạo phiếu nhập đầu tiên để ghi nhận hàng về'
            }
            action={
              canInput && !search ? (
                <button
                  onClick={handleOpenAdd}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus size={20} />
                  <span>Thêm phiếu nhập</span>
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: 3 THÔNG TIN CỐT LÕI (Sản phẩm & Quy cách, Thời gian, Khối lượng m³) */}
          <div className="block sm:hidden space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Phiếu nhập ({filteredImports.length})
              </span>
              <span className="text-[11px] text-slate-400">3 thông tin cốt lõi</span>
            </div>

            {filteredImports.map((imp) => (
              <div
                key={imp.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2.5"
              >
                {/* 1. Thông tin cốt lõi 1: Sản phẩm & Quy cách */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <ArrowDownToLine size={15} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 leading-snug truncate">
                        {imp.products?.name || 'Sản phẩm chưa rõ'}
                      </h3>
                    </div>
                    {imp.products?.size && (
                      <p className="text-xs text-slate-500 mt-1 pl-9 truncate">
                        Quy cách: {imp.products.size}
                      </p>
                    )}
                  </div>

                  {/* Hành động sửa/xóa CHỈ CHO ADMIN */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(imp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Sửa phiếu"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingImport(imp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa phiếu"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. & 3. Thông tin cốt lõi 2 (Thời gian) & Thông tin cốt lõi 3 (Khối lượng m³) */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Thời gian nhập
                    </span>
                    <div className="flex items-center gap-1 text-xs text-slate-700 font-medium mt-0.5">
                      <Clock size={12} className="text-slate-400" />
                      <span>{formatDateTime(imp.import_date)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Khối lượng (m³)
                    </span>
                    <p className="text-base font-extrabold text-emerald-600 leading-tight mt-0.5">
                      {formatM3(imp.total_m3, 3)}{' '}
                      <span className="text-xs font-semibold text-slate-500">m³</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatM3(imp.so_luot, 0)} lượt • HS: {imp.products?.conversion_coefficient}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP / TABLET FULL TABLE */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      STT
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tên hàng
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Kích thước
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Ngày giờ nhập
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Số lượt
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Hệ số QĐ
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tổng m³
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredImports.map((imp, idx) => (
                    <tr key={imp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                            <ArrowDownToLine size={18} />
                          </div>
                          <span className="text-sm font-semibold text-slate-800">
                            {imp.products?.name || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {imp.products?.size || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDateTime(imp.import_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-slate-800">
                        {formatM3(imp.so_luot, 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-slate-500">
                        {formatM3(imp.products?.conversion_coefficient, 3)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-emerald-600">
                        {formatM3(imp.total_m3, 3)}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(imp)}
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Sửa phiếu nhập"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => setDeletingImport(imp)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Xóa phiếu nhập"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingImport ? 'Sửa phiếu nhập kho (Quản trị viên)' : 'Thêm phiếu nhập kho'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Sản phẩm gỗ <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            >
              <option value="">-- Chọn sản phẩm --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.size ? `(${p.size})` : ''} - HS: {p.conversion_coefficient}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Ngày giờ nhập <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.import_date}
              onChange={(e) => setFormData({ ...formData, import_date: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Số lượt nhập <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formData.so_luot}
              onChange={(e) => setFormData({ ...formData, so_luot: e.target.value })}
              required
              placeholder="Nhập số lượt (Ví dụ: 10 hoặc 10,5)..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Real-time calculation preview */}
          {selectedProd && formData.so_luot && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Khối lượng m³ quy đổi
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">
                    {formatM3(calculatedM3, 3)} m³
                  </p>
                </div>
                <div className="text-right text-xs text-emerald-600">
                  <p>Hệ số: {selectedProd.conversion_coefficient}</p>
                  <p>Số lượt: {formData.so_luot}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {submitting ? 'Đang lưu & đồng bộ...' : (editingImport ? 'Lưu thay đổi' : 'Tạo phiếu nhập')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal (Admin only) */}
      <ConfirmModal
        open={!!deletingImport}
        onClose={() => setDeletingImport(null)}
        onConfirm={handleDelete}
        title="Xóa phiếu nhập kho"
        message={`Bạn có chắc muốn xóa phiếu nhập "${deletingImport?.products?.name}" ngày ${
          deletingImport ? formatDateTime(deletingImport.import_date) : ''
        }? Thao tác này sẽ được lưu vào Lịch sử thao tác.`}
        confirmText="Xóa phiếu"
        danger
      />
    </div>
  );
}
