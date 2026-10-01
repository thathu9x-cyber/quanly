import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Lock,
  Sparkles,
  UserCheck,
  Shield,
  ArrowDownToLine,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StorageService } from '../services/storage';
import { PinAccount, UserRole } from '../types';
import { formatDate } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';

export function AccountsPage() {
  const { profile: currentLoggedInUser, isAdmin, refreshProfile } = useAuth();
  const { show } = useToast();
  const [accounts, setAccounts] = useState<PinAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PinAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<PinAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    pin: '',
    role: 'nhap' as UserRole,
  });

  const loadAccounts = () => {
    setLoading(true);
    const list = StorageService.getPinAccounts();
    setAccounts(list);
    setLoading(false);
  };

  useEffect(() => {
    loadAccounts();
    const handleStorageChange = () => {
      loadAccounts();
    };
    window.addEventListener('app-storage-changed', handleStorageChange);
    return () => window.removeEventListener('app-storage-changed', handleStorageChange);
  }, []);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setFormData({
      name: '',
      pin: '',
      role: 'nhap',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (acc: PinAccount) => {
    setEditingAccount(acc);
    setFormData({
      name: acc.name,
      pin: acc.pin,
      role: acc.role,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!isAdmin) {
      show('Chỉ Quản trị viên (Admin) mới có quyền quản lý mã PIN', 'error');
      return;
    }

    const cleanPin = formData.pin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      show('Mã PIN phải bao gồm đúng 4 chữ số (từ 0-9)', 'error');
      return;
    }

    if (!formData.name.trim()) {
      show('Vui lòng nhập tên người dùng hoặc bộ phận', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await StorageService.savePinAccount({
        id: editingAccount?.id,
        pin: cleanPin,
        name: formData.name.trim(),
        role: formData.role,
      });

      if (!res.success) {
        show(res.error || 'Không thể lưu mã PIN', 'error');
        return;
      }

      show(
        editingAccount
          ? `Đã cập nhật mã PIN ${cleanPin} và đồng bộ Cloud Firestore`
          : `Đã cấp mã PIN ${cleanPin} cho ${formData.name} và đồng bộ Cloud Firestore`,
        'success'
      );

      if (editingAccount?.id === currentLoggedInUser?.id) {
        refreshProfile();
      }

      setModalOpen(false);
      setEditingAccount(null);
      setFormData({
        name: '',
        pin: '',
        role: 'nhap',
      });
      loadAccounts();
    } catch (err) {
      console.error(err);
      show('Lỗi khi lưu mã PIN: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;
    if (deletingAccount.id === currentLoggedInUser?.id) {
      show('Không thể xóa mã PIN mà bạn đang sử dụng đăng nhập', 'error');
      return;
    }
    const pin = deletingAccount.pin;
    const id = deletingAccount.id;
    setDeletingAccount(null);
    try {
      await StorageService.deletePinAccount(id);
      show(`Đã xóa mã PIN ${pin} và đồng bộ Cloud`, 'success');
      loadAccounts();
    } catch (err) {
      show('Lỗi khi xóa mã PIN: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  const totalAccounts = accounts.length;
  const adminAccounts = accounts.filter((u) => u.role === 'admin').length;
  const nhapAccounts = accounts.filter((u) => u.role === 'nhap').length;
  const xemAccounts = accounts.filter((u) => u.role === 'xem').length;

  const renderRoleBadge = (role: UserRole) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <Shield size={12} />
          Quản trị viên (Nhập, Sửa, Xóa)
        </span>
      );
    }
    if (role === 'nhap') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <ArrowDownToLine size={12} />
          Chỉ nhập liệu
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
        <Eye size={12} />
        Chỉ xem
      </span>
    );
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-xl mx-auto shadow-sm my-8">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Quyền truy cập bị từ chối</h2>
        <p className="text-sm text-slate-500 mt-2">
          Mục <strong>Mã PIN & Phân quyền</strong> chỉ dành riêng cho tài khoản{' '}
          <strong className="text-slate-700">Quản trị viên (Admin)</strong>.
        </p>
      </div>
    );
  }

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
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Mã PIN & Phân quyền
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles size={12} />
              Bảo mật 4 số
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Quản trị viên tạo 4 số và gán quyền: Quản trị viên (Nhập, Sửa, Xóa), Chỉ nhập, hoặc Chỉ xem
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-98 self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Cấp mã PIN mới</span>
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-sm uppercase tracking-wider font-semibold text-slate-500">
            Tổng mã PIN
          </p>
          <p className="text-xl sm:text-3xl font-extrabold text-slate-800 mt-1">{totalAccounts}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-sm uppercase tracking-wider font-semibold text-purple-600">
            Quản trị viên
          </p>
          <p className="text-xl sm:text-3xl font-extrabold text-purple-700 mt-1">{adminAccounts}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-sm uppercase tracking-wider font-semibold text-emerald-600">
            Chỉ nhập liệu
          </p>
          <p className="text-xl sm:text-3xl font-extrabold text-emerald-600 mt-1">{nhapAccounts}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-sm uppercase tracking-wider font-semibold text-blue-600">
            Chỉ xem
          </p>
          <p className="text-xl sm:text-3xl font-extrabold text-blue-600 mt-1">{xemAccounts}</p>
        </div>
      </div>

      {/* MOBILE VIEW: 3 THÔNG TIN CỐT LÕI (Tên & PIN, Quyền hạn, Ngày cấp) */}
      <div className="block sm:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Tài khoản ({accounts.length})
          </span>
          <span className="text-[11px] text-slate-400">3 thông tin cốt lõi</span>
        </div>

        {accounts.map((acc) => {
          const isCurrent = acc.id === currentLoggedInUser?.id;
          return (
            <div
              key={acc.id}
              className={`bg-white rounded-2xl border p-4 shadow-sm space-y-2.5 ${
                isCurrent ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'
              }`}
            >
              {/* 1. Tên nhân sự & Mã PIN 4 số */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {acc.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-slate-800 truncate">{acc.name}</h3>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[10px] font-semibold shrink-0">
                            Bạn
                          </span>
                        )}
                      </div>
                      <span className="inline-block font-mono font-black text-indigo-600 text-sm mt-0.5 tracking-wider">
                        PIN: •••• ({acc.pin})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(acc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Sửa quyền"
                  >
                    <Pencil size={15} />
                  </button>
                  {!isCurrent && (
                    <button
                      onClick={() => setDeletingAccount(acc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Xóa mã PIN"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Quyền hạn & 3. Ngày cấp mã */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Quyền hạn
                  </span>
                  {renderRoleBadge(acc.role)}
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Ngày cấp
                  </span>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {formatDate(acc.created_at)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
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
                  Mã PIN (4 số)
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tên nhân sự / Bộ phận
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Quyền hạn
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ngày cấp mã
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((acc, idx) => {
                const isCurrent = acc.id === currentLoggedInUser?.id;
                return (
                  <tr
                    key={acc.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isCurrent ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black tracking-widest text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200/80 shadow-inner">
                          {acc.pin}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {acc.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            {acc.name}
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[11px] font-medium">
                                Bạn
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{renderRoleBadge(acc.role)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(acc.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(acc)}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Sửa thông tin & quyền"
                        >
                          <Pencil size={17} />
                        </button>
                        {!isCurrent && (
                          <button
                            onClick={() => setDeletingAccount(acc)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Xóa mã PIN"
                          >
                            <Trash2 size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAccount ? 'Sửa mã PIN & Quyền hạn' : 'Cấp mã PIN mới'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Mã PIN (Đúng 4 chữ số) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={4}
              pattern="\d{4}"
              inputMode="numeric"
              value={formData.pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                setFormData({ ...formData, pin: val });
              }}
              required
              placeholder="Ví dụ: 8888"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 font-mono text-xl tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:tracking-normal placeholder:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tên người sử dụng / Bộ phận <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Ví dụ: Thủ kho ca sáng, Kế toán kiểm kê..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Phân quyền tài khoản <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2.5">
              {/* Option 1: Quản trị viên */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  formData.role === 'admin'
                    ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={formData.role === 'admin'}
                  onChange={() => setFormData({ ...formData, role: 'admin' })}
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Shield size={14} className="text-purple-600" />
                    Quản trị viên (Admin)
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Được quyền <strong>Nhập, Sửa, Xóa</strong> toàn bộ phiếu nhập, xuất, sản phẩm,
                    quản lý mã PIN và xem Lịch sử thao tác.
                  </p>
                </div>
              </label>

              {/* Option 2: Chỉ nhập */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  formData.role === 'nhap'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="nhap"
                  checked={formData.role === 'nhap'}
                  onChange={() => setFormData({ ...formData, role: 'nhap' })}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <ArrowDownToLine size={14} className="text-emerald-600" />
                    Chỉ nhập liệu (Nhân viên)
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Được tạo mới phiếu nhập, phiếu xuất và sản phẩm. <strong>Không được sửa hoặc xóa</strong>.
                  </p>
                </div>
              </label>

              {/* Option 3: Chỉ xem */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  formData.role === 'xem'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="xem"
                  checked={formData.role === 'xem'}
                  onChange={() => setFormData({ ...formData, role: 'xem' })}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Eye size={14} className="text-blue-600" />
                    Chỉ xem (Ban giám đốc / Kế toán đối soát)
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chỉ được xem bảng số liệu tồn kho, xuất/nhập và tải file Excel báo cáo.
                  </p>
                </div>
              </label>
            </div>
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
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {submitting ? 'Đang lưu & đồng bộ...' : (editingAccount ? 'Lưu thay đổi' : 'Cấp mã PIN')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deletingAccount}
        onClose={() => setDeletingAccount(null)}
        onConfirm={handleDelete}
        title="Xóa mã PIN"
        message={`Bạn có chắc muốn thu hồi mã PIN ${deletingAccount?.pin} của "${deletingAccount?.name}"? Người dùng này sẽ không thể đăng nhập vào hệ thống nữa.`}
        confirmText="Xóa mã PIN"
        danger
      />
    </div>
  );
}
