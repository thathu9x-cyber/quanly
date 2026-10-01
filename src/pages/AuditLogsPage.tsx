import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  ShieldAlert,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  BarChart3,
  KeyRound,
  Trash2,
  Edit3,
  PlusCircle,
  CheckCircle2,
  User,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StorageService } from '../services/storage';
import { AuditLog, AuditModule, AuditActionType } from '../types';
import { formatDateTime } from '../utils/formatters';

export function AuditLogsPage() {
  const { isAdmin, profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  const loadLogs = () => {
    if (isAdmin) {
      const data = StorageService.getAuditLogs();
      setLogs(data);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();

    const handleStorageChange = () => {
      loadLogs();
    };

    window.addEventListener('app-storage-changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('app-storage-changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-xl mx-auto shadow-sm my-8">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Quyền truy cập bị từ chối</h2>
        <p className="text-sm text-slate-500 mt-2">
          Mục <strong>Lịch sử thao tác nhập liệu</strong> chỉ dành riêng cho tài khoản{' '}
          <strong className="text-slate-700">Quản trị viên (Admin)</strong>. Bạn đang đăng nhập
          với vai trò <strong>{profile?.name}</strong>.
        </p>
      </div>
    );
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === '' ||
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_pin.includes(searchTerm) ||
      log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.summary.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesModule = selectedModule === 'all' || log.module === selectedModule;
    const matchesAction = selectedAction === 'all' || log.action === selectedAction;

    return matchesSearch && matchesModule && matchesAction;
  });

  const getModuleBadge = (module: AuditModule) => {
    switch (module) {
      case 'import':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowDownToLine size={12} />
            Nhập kho
          </span>
        );
      case 'export':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <ArrowUpFromLine size={12} />
            Xuất kho
          </span>
        );
      case 'product':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Package size={12} />
            Sản phẩm
          </span>
        );
      case 'report':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <BarChart3 size={12} />
            Báo cáo
          </span>
        );
      case 'pin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <KeyRound size={12} />
            Mã PIN
          </span>
        );
      default:
        return null;
    }
  };

  const getActionBadge = (action: AuditActionType) => {
    switch (action) {
      case 'create':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100/70 text-emerald-800">
            <PlusCircle size={11} />
            Thêm mới
          </span>
        );
      case 'update':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100/70 text-amber-800">
            <Edit3 size={11} />
            Chỉnh sửa
          </span>
        );
      case 'delete':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100/70 text-rose-800">
            <Trash2 size={11} />
            Xóa bỏ
          </span>
        );
      case 'finalize':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100/70 text-indigo-800">
            <CheckCircle2 size={11} />
            Chốt sổ
          </span>
        );
      default:
        return null;
    }
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Lịch sử thao tác nhập liệu
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <History size={12} />
              Chỉ Quản trị viên
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ghi nhận toàn bộ thao tác thêm, sửa, xóa phiếu nhập, xuất, sản phẩm và chốt tháng
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
            Tổng cộng: {filteredLogs.length} thao tác
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo nhân sự, mã PIN, nội dung..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 pr-8 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả danh mục</option>
                <option value="import">Nhập kho</option>
                <option value="export">Xuất kho</option>
                <option value="product">Sản phẩm</option>
                <option value="report">Báo cáo tháng</option>
                <option value="pin">Mã PIN & Quyền</option>
              </select>
            </div>

            <div className="relative">
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 pr-8 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả hành động</option>
                <option value="create">Thêm mới</option>
                <option value="update">Chỉnh sửa</option>
                <option value="delete">Xóa bỏ</option>
                <option value="finalize">Chốt sổ</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE COMPACT VIEW: 3 Core Items Only (No Horizontal Scroll) */}
      <div className="block sm:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Danh sách 3 thông tin cốt lõi
          </span>
          <span className="text-[11px] text-slate-400">Tối ưu di động</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            Không tìm thấy lịch sử thao tác nào phù hợp
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-2.5"
            >
              {/* Core 1: Người thực hiện & Mã PIN */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                    <User size={14} />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      {log.user_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      PIN: {log.user_pin}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {getActionBadge(log.action)}
                </div>
              </div>

              {/* Core 2: Hành động & Nội dung chi tiết */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {getModuleBadge(log.module)}
                  <span className="text-xs font-bold text-slate-800">{log.title}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                  {log.summary}
                </p>
              </div>

              {/* Core 3: Thời gian thao tác */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{formatDateTime(log.created_at)}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">ID: {log.id.slice(-6)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP / TABLET FULL TABLE */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Người thực hiện
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Hành động
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Chi tiết thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                    Không tìm thấy lịch sử thao tác nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span>{formatDateTime(log.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {log.user_name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{log.user_name}</p>
                          <span className="text-[10px] font-mono text-slate-400">
                            PIN: {log.user_pin}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{getModuleBadge(log.module)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{getActionBadge(log.action)}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-semibold text-slate-800">{log.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-normal">{log.summary}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
