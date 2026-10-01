import React, { useState, useEffect } from 'react';
import { Package, Download, Plus, Search, Pencil, Trash2, Lock, Sparkles, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StorageService } from '../services/storage';
import { Product } from '../types';
import { formatM3, formatDate, parseNumberInput } from '../utils/formatters';
import { exportToExcel } from '../utils/excel';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { EmptyState } from '../components/EmptyState';

export function ProductsPage() {
  const { canInput, isAdmin } = useAuth();
  const { show } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    size: '',
    conversion_coefficient: '',
  });

  const loadProducts = () => {
    setLoading(true);
    const data = StorageService.getProducts();
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();

    const handleStorageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string }>;
      if (!customEvent.detail || customEvent.detail.key === 'ht_products') {
        loadProducts();
      }
    };

    window.addEventListener('app-storage-changed', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('app-storage-changed', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const handleResetToStandard = () => {
    StorageService.resetProductsToDefault();
    loadProducts();
    setSyncModalOpen(false);
    show('Đã cập nhật danh mục sản phẩm chuẩn theo bảng quy cách', 'success');
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({ name: '', size: '', conversion_coefficient: '' });
    setModalOpen(true);
  };

  const canEdit = isAdmin || canInput;

  const handleOpenEdit = (prod: Product) => {
    if (!canEdit) {
      show('Tài khoản chỉ xem không có quyền sửa sản phẩm', 'error');
      return;
    }
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      size: prod.size,
      conversion_coefficient: String(prod.conversion_coefficient),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!canInput) {
      show('Tài khoản chỉ xem không được thêm hoặc sửa sản phẩm', 'error');
      return;
    }

    const coeff = parseNumberInput(formData.conversion_coefficient);
    if (coeff <= 0) {
      show('Hệ số quy đổi phải lớn hơn 0 (ví dụ: 0.05 hoặc 0,05)', 'error');
      return;
    }

    if (!formData.name.trim()) {
      show('Vui lòng nhập tên sản phẩm', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingProduct) {
        if (!canEdit) {
          show('Tài khoản chỉ xem không có quyền sửa sản phẩm', 'error');
          return;
        }
        await StorageService.saveProduct({
          id: editingProduct.id,
          name: formData.name.trim(),
          size: formData.size.trim(),
          conversion_coefficient: coeff,
        });
        show('Đã cập nhật sản phẩm và đồng bộ Cloud thành công', 'success');
      } else {
        await StorageService.saveProduct({
          name: formData.name.trim(),
          size: formData.size.trim(),
          conversion_coefficient: coeff,
        });
        show('Đã thêm sản phẩm mới và đồng bộ Cloud thành công', 'success');
      }

      setModalOpen(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        size: '',
        conversion_coefficient: '',
      });
      loadProducts();
    } catch (err) {
      show('Lỗi khi lưu sản phẩm: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) {
      show('Chỉ Quản trị viên mới có quyền xóa sản phẩm', 'error');
      return;
    }
    if (!deletingProduct) return;
    const id = deletingProduct.id;
    setDeletingProduct(null);
    try {
      await StorageService.deleteProduct(id);
      show('Đã xóa sản phẩm và đồng bộ Cloud', 'success');
      loadProducts();
    } catch (err) {
      show('Lỗi khi xóa sản phẩm: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.size.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportExcel = () => {
    exportToExcel(
      [
        {
          name: 'Danh_muc_hang',
          data: filteredProducts.map((p, idx) => ({
            STT: idx + 1,
            'Tên sản phẩm': p.name,
            'Kích thước / Quy cách': p.size || '',
            'Hệ số quy đổi (m³)': p.conversion_coefficient,
            'Ngày tạo': formatDate(p.created_at),
          })),
        },
      ],
      'Danh_muc_hang'
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Danh mục sản phẩm</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Quản lý danh sách quy cách và hệ số quy đổi ra m³ gỗ
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => setSyncModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-100 transition-colors shadow-sm"
              title="Đồng bộ lại danh mục sản phẩm theo bảng quy cách chuẩn"
            >
              <RotateCcw size={15} />
              <span>Khôi phục bảng chuẩn</span>
            </button>
          )}

          {products.length > 0 && (
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
              <span>Thêm sản phẩm</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-medium">
              <Lock size={15} />
              <span>Chỉ xem</span>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      {products.length > 0 && (
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc kích thước..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      )}

      {/* List / Table */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={<Package size={40} />}
            title={search ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm nào'}
            description={
              search ? 'Thử từ khóa khác' : 'Bắt đầu bằng việc thêm sản phẩm đầu tiên'
            }
            action={
              canInput && !search ? (
                <button
                  onClick={handleOpenAdd}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus size={20} />
                  <span>Thêm sản phẩm</span>
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: 3 THÔNG TIN CỐT LÕI (Tên hàng, Quy cách, Hệ số quy đổi) */}
          <div className="block sm:hidden space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Sản phẩm ({filteredProducts.length})
              </span>
              <span className="text-[11px] text-slate-400">3 thông tin cốt lõi</span>
            </div>

            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2"
              >
                {/* 1. Tên hàng */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Package size={15} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 leading-snug truncate">
                      {prod.name}
                    </h3>
                  </div>

                  {/* Hành động sửa/xóa CHỈ CHO ADMIN */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Sửa sản phẩm"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingProduct(prod)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa sản phẩm"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Quy cách (Kích thước) & 3. Hệ số quy đổi */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Quy cách / Kích thước
                    </span>
                    <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">
                      {prod.size || 'Tiêu chuẩn xưởng'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Hệ số quy đổi m³
                    </span>
                    <p className="text-sm font-extrabold text-blue-700 mt-0.5">
                      {formatM3(prod.conversion_coefficient, 4)}{' '}
                      <span className="text-[10px] font-normal text-slate-400">m³/lượt</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      STT
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tên sản phẩm
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Kích thước / Quy cách
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Hệ số quy đổi (m³)
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((prod, idx) => (
                    <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <Package size={18} />
                          </div>
                          <span className="text-sm font-semibold text-slate-800">{prod.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{prod.size || '—'}</td>
                      <td className="px-6 py-4 text-sm text-right font-mono font-bold text-blue-600">
                        {formatM3(prod.conversion_coefficient, 4)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(prod.created_at)}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(prod)}
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Sửa sản phẩm"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => setDeletingProduct(prod)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Xóa sản phẩm"
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
        title={editingProduct ? 'Sửa sản phẩm (Quản trị viên)' : 'Thêm sản phẩm mới'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Tên sản phẩm gỗ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Ví dụ: G2.5 hoặc G01.5"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Kích thước / Quy cách
            </label>
            <input
              type="text"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              placeholder="Ví dụ: 2.5 cm hoặc 1.5cm"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Hệ số quy đổi ra m³ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formData.conversion_coefficient}
              onChange={(e) =>
                setFormData({ ...formData, conversion_coefficient: e.target.value })
              }
              required
              placeholder="Ví dụ: 0.05 hoặc 0,05"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-slate-500 mt-1">
              Khối lượng m³ = Số lượt nhập/xuất × Hệ số quy đổi
            </p>
          </div>

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
              {submitting ? 'Đang lưu & đồng bộ...' : (editingProduct ? 'Lưu thay đổi' : 'Thêm sản phẩm')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset to Standard Catalog Modal */}
      <ConfirmModal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        onConfirm={handleResetToStandard}
        title="Khôi phục danh mục sản phẩm theo bảng chuẩn"
        message="Hệ thống sẽ cập nhật lại danh sách sản phẩm gồm 6 mặt hàng chuẩn: G2.5 (2.5 cm, 0.05 m³), G01.5 (1.5cm, 0.03 m³), G02 (2 cm, 0.04 m³), G03 (3 cm, 0.06 m³), G04 (4 cm, 0.08 m³), G06 (6 cm, 0.12 m³). Bạn có chắc chắn muốn thực hiện?"
        confirmText="Đồng ý khôi phục"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
        title="Xóa sản phẩm"
        message={`Bạn có chắc muốn xóa sản phẩm "${deletingProduct?.name}"? Thao tác này sẽ được ghi nhận vào Lịch sử thao tác.`}
        confirmText="Xóa sản phẩm"
        danger
      />
    </div>
  );
}
