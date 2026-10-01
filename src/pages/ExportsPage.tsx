import React, { useState, useEffect } from 'react';
import {
  ArrowUpFromLine,
  Download,
  Plus,
  Search,
  Pencil,
  Trash2,
  Lock,
  DollarSign,
  Package,
  Layers,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StorageService } from '../services/storage';
import { ExportRecord, Product } from '../types';
import { formatM3, formatVND, formatDateTime, toInputDateTime, parseNumberInput } from '../utils/formatters';
import { exportToExcel } from '../utils/excel';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { EmptyState } from '../components/EmptyState';

export function ExportsPage() {
  const { canInput, isAdmin } = useAuth();
  const { show } = useToast();
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExport, setEditingExport] = useState<ExportRecord | null>(null);
  const [deletingExport, setDeletingExport] = useState<ExportRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    product_id: '',
    export_date: toInputDateTime(),
    so_luot: '',
    unit_price: '',
    note: '',
  });

  const loadData = () => {
    setLoading(true);
    const prodList = StorageService.getProducts();
    const expList = StorageService.getExports();
    setProducts(prodList);
    setExports(expList);
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
      show('Vui lòng thêm sản phẩm trước khi tạo phiếu xuất', 'error');
      return;
    }
    setEditingExport(null);
    setFormData({
      product_id: products[0]?.id || '',
      export_date: toInputDateTime(),
      so_luot: '',
      unit_price: '',
      note: '',
    });
    setModalOpen(true);
  };

  const canEdit = isAdmin || canInput;

  const handleOpenEdit = (exp: ExportRecord) => {
    if (!canEdit) {
      show('Tài khoản chỉ xem không có quyền sửa phiếu xuất', 'error');
      return;
    }
    setEditingExport(exp);
    setFormData({
      product_id: exp.product_id,
      export_date: toInputDateTime(exp.export_date),
      so_luot: String(exp.so_luot),
      unit_price: String(exp.unit_price),
      note: exp.note || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!canInput) {
      show('Tài khoản chỉ xem không được tạo hoặc sửa phiếu xuất', 'error');
      return;
    }

    const soLuotNum = parseNumberInput(formData.so_luot);
    const priceNum = parseNumberInput(formData.unit_price);

    if (soLuotNum <= 0) {
      show('Số lượt phải lớn hơn 0 (ví dụ: 10 hoặc 10,5)', 'error');
      return;
    }
    if (priceNum < 0) {
      show('Đơn giá không hợp lệ', 'error');
      return;
    }
    if (!formData.product_id) {
      show('Vui lòng chọn sản phẩm', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingExport) {
        if (!canEdit) {
          show('Tài khoản chỉ xem không được quyền sửa phiếu', 'error');
          return;
        }
        await StorageService.saveExport({
          id: editingExport.id,
          product_id: formData.product_id,
          export_date: formData.export_date,
          so_luot: soLuotNum,
          unit_price: priceNum,
          note: formData.note.trim(),
        });
        show('Đã cập nhật phiếu xuất và đồng bộ Cloud thành công', 'success');
      } else {
        await StorageService.saveExport({
          product_id: formData.product_id,
          export_date: formData.export_date,
          so_luot: soLuotNum,
          unit_price: priceNum,
          note: formData.note.trim(),
        });
        show('Đã tạo phiếu xuất kho và đồng bộ Cloud thành công', 'success');
      }

      setModalOpen(false);
      setEditingExport(null);
      setFormData({
        product_id: products[0]?.id || '',
        export_date: toInputDateTime(),
        so_luot: '',
        unit_price: '',
        note: '',
      });
      loadData();
    } catch (err) {
      console.error(err);
      show('Lỗi khi lưu phiếu xuất: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) {
      show('Chỉ Quản trị viên mới có quyền xóa phiếu xuất', 'error');
      return;
    }
    if (!deletingExport) return;
    const id = deletingExport.id;
    setDeletingExport(null);
    try {
      await StorageService.deleteExport(id);
      show('Đã xóa phiếu xuất kho và đồng bộ Cloud', 'success');
      loadData();
    } catch (err) {
      show('Lỗi khi xóa phiếu: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  const filteredExports = exports.filter((exp) => {
    const prodName = exp.products?.name || '';
    const prodSize = exp.products?.size || '';
    const note = exp.note || '';
    const q = search.toLowerCase();
    return (
      prodName.toLowerCase().includes(q) ||
      prodSize.toLowerCase().includes(q) ||
      note.toLowerCase().includes(q)
    );
  });

  // Totals
  const totalCount = filteredExports.length;
  const totalLuot = filteredExports.reduce((sum, e) => sum + Number(e.so_luot || 0), 0);
  const totalM3 = filteredExports.reduce((sum, e) => sum + Number(e.total_m3 || 0), 0);
  const totalRevenue = filteredExports.reduce((sum, e) => sum + Number(e.revenue || 0), 0);

  // Modal live preview calculations
  const selectedProd = products.find((p) => p.id === formData.product_id);
  const calculatedM3 =
    (parseNumberInput(formData.so_luot) || 0) * (selectedProd?.conversion_coefficient || 0);
  const calculatedRev = calculatedM3 * (parseNumberInput(formData.unit_price) || 0);

  const handleExportExcel = () => {
    exportToExcel(
      [
        {
          name: 'Xuat_kho',
          data: filteredExports.map((exp, idx) => ({
            STT: idx + 1,
            'Tên hàng': exp.products?.name || '',
            'Kích thước': exp.products?.size || '',
            'Ngày xuất': formatDateTime(exp.export_date),
            'Số lượt': Number(exp.so_luot),
            'Tổng m³': Number(exp.total_m3),
            'Đơn giá (đ/m³)': Number(exp.unit_price),
            'Doanh thu': Number(exp.revenue),
            'Ghi chú': exp.note || '',
          })),
        },
      ],
      'Xuat_kho'
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Xuất kho</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ghi nhận hàng xuất bán & tính doanh thu tự động
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {exports.length > 0 && (
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
              <span>Thêm phiếu xuất</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-medium">
              <Lock size={15} />
              <span>Chỉ xem</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-sm font-medium text-slate-500 truncate">Tổng phiếu</p>
          <p className="text-lg sm:text-2xl font-bold text-slate-800 mt-0.5">{formatM3(totalCount, 0)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-sm font-medium text-slate-500 truncate">Tổng lượt</p>
          <p className="text-lg sm:text-2xl font-bold text-slate-800 mt-0.5">{formatM3(totalLuot, 0)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-sm font-medium text-slate-500 truncate">Khối lượng m³</p>
          <p className="text-lg sm:text-2xl font-bold text-amber-600 mt-0.5 truncate">
            {formatM3(totalM3)} <span className="text-xs sm:text-base font-medium">m³</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[11px] sm:text-sm font-medium text-slate-500 truncate">Tổng doanh thu</p>
          <p className="text-lg sm:text-2xl font-bold text-violet-600 mt-0.5 truncate">
            {formatVND(totalRevenue)}
          </p>
        </div>
      </div>

      {/* Search */}
      {exports.length > 0 && (
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, kích thước, ghi chú..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      )}

      {/* Content List: MOBILE (3 Thông tin cốt lõi) vs DESKTOP (Bảng đầy đủ) */}
      {filteredExports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={<ArrowUpFromLine size={40} />}
            title={search ? 'Không tìm thấy phiếu xuất' : 'Chưa có phiếu xuất kho nào'}
            description={
              search ? 'Thử từ khóa khác' : 'Tạo phiếu xuất đầu tiên để ghi nhận doanh thu'
            }
            action={
              canInput && !search ? (
                <button
                  onClick={handleOpenAdd}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus size={20} />
                  <span>Thêm phiếu xuất</span>
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: 3 THÔNG TIN CỐT LÕI (Sản phẩm, Thời gian, Doanh thu & m³) */}
          <div className="block sm:hidden space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Phiếu xuất ({filteredExports.length})
              </span>
              <span className="text-[11px] text-slate-400">3 thông tin cốt lõi</span>
            </div>

            {filteredExports.map((exp) => (
              <div
                key={exp.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2.5"
              >
                {/* 1. Thông tin cốt lõi 1: Sản phẩm & Quy cách */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <ArrowUpFromLine size={15} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 leading-snug truncate">
                        {exp.products?.name || 'Sản phẩm chưa rõ'}
                      </h3>
                    </div>
                    {exp.products?.size && (
                      <p className="text-xs text-slate-500 mt-1 pl-9 truncate">
                        Quy cách: {exp.products.size}
                      </p>
                    )}
                  </div>

                  {/* Hành động sửa/xóa CHỈ CHO ADMIN */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(exp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Sửa phiếu"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingExport(exp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa phiếu"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. & 3. Thông tin cốt lõi 2 (Thời gian & Ghi chú) và Thông tin cốt lõi 3 (Doanh thu & Khối lượng) */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Thời gian xuất
                    </span>
                    <div className="flex items-center gap-1 text-xs text-slate-700 font-medium mt-0.5">
                      <Clock size={12} className="text-slate-400" />
                      <span>{formatDateTime(exp.export_date)}</span>
                    </div>
                    {exp.note && (
                      <p className="text-[11px] text-slate-400 truncate mt-1 italic">
                        &ldquo;{exp.note}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Doanh thu & Khối lượng
                    </span>
                    <p className="text-base font-extrabold text-violet-700 leading-tight mt-0.5">
                      {formatVND(exp.revenue)}
                    </p>
                    <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
                      {formatM3(exp.total_m3, 3)} m³{' '}
                      <span className="text-slate-400 font-normal">({formatM3(exp.so_luot, 0)} lượt)</span>
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
                      Ngày giờ xuất
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Số lượt
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tổng m³
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Đơn giá (đ/m³)
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Doanh thu
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Ghi chú
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExports.map((exp, idx) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                            <ArrowUpFromLine size={18} />
                          </div>
                          <span className="text-sm font-semibold text-slate-800">
                            {exp.products?.name || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {exp.products?.size || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDateTime(exp.export_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-slate-800">
                        {formatM3(exp.so_luot, 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-amber-600">
                        {formatM3(exp.total_m3, 3)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-slate-600 font-medium">
                        {formatVND(exp.unit_price)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-violet-600">
                        {formatVND(exp.revenue)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                        {exp.note || '—'}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(exp)}
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Sửa phiếu xuất"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => setDeletingExport(exp)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Xóa phiếu xuất"
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
        title={editingExport ? 'Sửa phiếu xuất kho (Quản trị viên)' : 'Thêm phiếu xuất kho'}
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
              Ngày giờ xuất <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.export_date}
              onChange={(e) => setFormData({ ...formData, export_date: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Số lượt xuất <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={formData.so_luot}
                onChange={(e) => setFormData({ ...formData, so_luot: e.target.value })}
                required
                placeholder="Ví dụ: 10 hoặc 10,5"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Đơn giá (VNĐ / m³) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                required
                placeholder="Ví dụ: 3.500.000 hoặc 3500000"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Ghi chú</label>
            <input
              type="text"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Khách hàng, đơn vị mua, xe chở..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Real-time calculation preview */}
          {selectedProd && formData.so_luot && (
            <div className="p-4 rounded-xl bg-violet-50 border border-violet-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-violet-800 uppercase tracking-wider">
                    Tổng m³ quy đổi
                  </p>
                  <p className="text-xl font-bold text-violet-700">
                    {formatM3(calculatedM3, 3)} m³
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-violet-800 uppercase tracking-wider">
                    Thành tiền (Doanh thu)
                  </p>
                  <p className="text-xl font-bold text-violet-700">{formatVND(calculatedRev)}</p>
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
              {submitting ? 'Đang lưu & đồng bộ...' : (editingExport ? 'Lưu thay đổi' : 'Tạo phiếu xuất')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal (Admin only) */}
      <ConfirmModal
        open={!!deletingExport}
        onClose={() => setDeletingExport(null)}
        onConfirm={handleDelete}
        title="Xóa phiếu xuất kho"
        message={`Bạn có chắc muốn xóa phiếu xuất "${deletingExport?.products?.name}" ngày ${
          deletingExport ? formatDateTime(deletingExport.export_date) : ''
        }? Thao tác này sẽ được ghi vào Lịch sử thao tác.`}
        confirmText="Xóa phiếu"
        danger
      />
    </div>
  );
}
