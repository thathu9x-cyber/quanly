import React, { useState, useEffect } from 'react';
import {
  Download,
  Calendar,
  CheckCircle2,
  Lock,
  DollarSign,
  Users,
  Zap,
  Coins,
  Receipt,
  Save,
  Send,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
  Edit3,
  FileSpreadsheet,
  AlertCircle,
  FileText,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StorageService } from '../services/storage';
import { MonthlyReport } from '../types';
import { formatM3, formatVND, getMonthName, parseNumberInput } from '../utils/formatters';
import { exportToExcel } from '../utils/excel';
import { ConfirmModal } from '../components/ConfirmModal';

export function ReportsPage() {
  const { isAdmin, profile } = useAuth();
  const { show } = useToast();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ht_report_year');
      if (saved) return parseInt(saved, 10);
    } catch {}
    return now.getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ht_report_month');
      if (saved) return parseInt(saved, 10);
    } catch {}
    return now.getMonth() + 1;
  });

  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Actual warehouse statistics calculated directly from slips
  const [actualStats, setActualStats] = useState({
    importM3: 0,
    exportM3: 0,
    revenue: 0,
    importCount: 0,
    exportCount: 0,
  });

  // Report fields (editable by Admin to publish)
  const [reportRevenue, setReportRevenue] = useState<string>('0');
  const [reportImportM3, setReportImportM3] = useState<string>('0');
  const [reportExportM3, setReportExportM3] = useState<string>('0');
  const [reportNote, setReportNote] = useState<string>('');

  const [costs, setCosts] = useState({
    cost_goods: '0',
    cost_labor: '0',
    cost_electricity: '0',
    cost_capital: '0',
    cost_other: '0',
  });

  // Publication state
  const [isPublished, setIsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | undefined>();
  const [publishedBy, setPublishedBy] = useState<string | undefined>();
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [existingReportId, setExistingReportId] = useState<string | null>(null);

  // Confirmation Modals
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [confirmResetDefaultOpen, setConfirmResetDefaultOpen] = useState(false);
  const [deletingReport, setDeletingReport] = useState<MonthlyReport | null>(null);

  const handleDeleteReportFromTable = async () => {
    if (!isAdmin || !deletingReport) return;
    const target = deletingReport;
    setDeletingReport(null);
    try {
      await StorageService.deleteMonthlyReportById(target.id);
      show(`Đã xóa báo cáo tháng ${target.month}/${target.year} và đồng bộ Cloud`, 'info');
      loadData();
    } catch (err) {
      show('Lỗi khi xóa báo cáo: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  const loadData = () => {
    setLoading(true);
    const allReports = StorageService.getMonthlyReports();
    setReports(allReports);

    // Get actual warehouse records for the month
    const imports = StorageService.getImports();
    const exports = StorageService.getExports();

    const mImports = imports.filter((i) => {
      const d = new Date(i.import_date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });

    const mExports = exports.filter((e) => {
      const d = new Date(e.export_date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });

    const totalImp = mImports.reduce((sum, i) => sum + Number(i.total_m3 || 0), 0);
    const totalExp = mExports.reduce((sum, e) => sum + Number(e.total_m3 || 0), 0);
    const totalRev = mExports.reduce((sum, e) => sum + Number(e.revenue || 0), 0);

    const actual = {
      importM3: totalImp,
      exportM3: totalExp,
      revenue: totalRev,
      importCount: mImports.length,
      exportCount: mExports.length,
    };
    setActualStats(actual);

    // Check if there is already a saved/published report for this month
    const existing = allReports.find(
      (r) => r.year === selectedYear && r.month === selectedMonth
    );

    if (existing) {
      setExistingReportId(existing.id);
      setIsPublished(Boolean(existing.finalized));
      setPublishedAt(existing.published_at);
      setPublishedBy(existing.published_by);
      setUpdatedAt(existing.updated_at);
      setReportRevenue(String(existing.total_revenue ?? 0));
      setReportImportM3(String(existing.total_import_m3 ?? 0));
      setReportExportM3(String(existing.total_export_m3 ?? 0));
      setReportNote(existing.note || '');
      setCosts({
        cost_goods: String(existing.cost_goods || 0),
        cost_labor: String(existing.cost_labor || 0),
        cost_electricity: String(existing.cost_electricity || 0),
        cost_capital: String(existing.cost_capital || 0),
        cost_other: String(existing.cost_other || 0),
      });
    } else {
      setExistingReportId(null);
      setIsPublished(false);
      setPublishedAt(undefined);
      setPublishedBy(undefined);
      setUpdatedAt(undefined);
      // Default to actual stats from warehouse records
      setReportRevenue(String(totalRev));
      setReportImportM3(String(totalImp));
      setReportExportM3(String(totalExp));
      setReportNote('');
      setCosts({
        cost_goods: '0',
        cost_labor: '0',
        cost_electricity: '0',
        cost_capital: '0',
        cost_other: '0',
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const handleStorageChange = () => {
      loadData();
    };
    window.addEventListener('app-storage-changed', handleStorageChange);
    return () => window.removeEventListener('app-storage-changed', handleStorageChange);
  }, [selectedYear, selectedMonth]);

  const costFields = [
    {
      key: 'cost_goods' as const,
      label: 'Giá vốn hàng bán',
      icon: Coins,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      key: 'cost_labor' as const,
      label: 'Chi phí nhân công',
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      key: 'cost_electricity' as const,
      label: 'Tiền điện sản xuất / vận hành',
      icon: Zap,
      color: 'bg-yellow-50 text-yellow-600',
    },
    {
      key: 'cost_capital' as const,
      label: 'Chi phí vốn / Lãi vay',
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      key: 'cost_other' as const,
      label: 'Chi phí khác (vận chuyển, hao hụt...)',
      icon: Receipt,
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  // Live calculations based on current input values
  const numRevenue = parseNumberInput(reportRevenue);
  const numImportM3 = parseNumberInput(reportImportM3);
  const numExportM3 = parseNumberInput(reportExportM3);

  const totalCost =
    parseNumberInput(costs.cost_goods) +
    parseNumberInput(costs.cost_labor) +
    parseNumberInput(costs.cost_electricity) +
    parseNumberInput(costs.cost_capital) +
    parseNumberInput(costs.cost_other);

  const calculatedProfit = numRevenue - totalCost;
  const profitMargin = numRevenue > 0 ? (calculatedProfit / numRevenue) * 100 : 0;

  // Check if current values differ from actual warehouse numbers
  const hasModifiedFigures =
    numRevenue !== actualStats.revenue ||
    Math.abs(numImportM3 - actualStats.importM3) > 0.0001 ||
    Math.abs(numExportM3 - actualStats.exportM3) > 0.0001;

  // Reset editable figures back to actual warehouse values
  const handleResetToActual = () => {
    setReportRevenue(String(actualStats.revenue));
    setReportImportM3(String(actualStats.importM3));
    setReportExportM3(String(actualStats.exportM3));
    show('Đã nạp lại số liệu gốc từ phiếu nhập/xuất kho', 'info');
  };

  // Save as Draft or Publish
  const handleSave = async (publishNow: boolean) => {
    if (!isAdmin) {
      show('Chỉ Quản trị viên (Admin) mới có quyền sửa và xuất bản báo cáo', 'error');
      return;
    }

    setSaving(true);
    try {
      await StorageService.saveMonthlyReport({
        year: selectedYear,
        month: selectedMonth,
        total_import_m3: numImportM3,
        total_export_m3: numExportM3,
        total_revenue: numRevenue,
        cost_goods: parseNumberInput(costs.cost_goods),
        cost_labor: parseNumberInput(costs.cost_labor),
        cost_electricity: parseNumberInput(costs.cost_electricity),
        cost_capital: parseNumberInput(costs.cost_capital),
        cost_other: parseNumberInput(costs.cost_other),
        total_cost: totalCost,
        profit: calculatedProfit,
        finalized: publishNow,
        published_at: publishNow ? new Date().toISOString() : publishedAt,
        published_by: publishNow ? profile?.name || 'Quản trị viên' : publishedBy,
        note: reportNote.trim() || undefined,
      });

      if (publishNow) {
        show(
          `Đã xuất bản thành công báo cáo ${getMonthName(selectedMonth)} / ${selectedYear} và đồng bộ Cloud!`,
          'success'
        );
      } else {
        show('Đã lưu bản nháp báo cáo và đồng bộ Cloud thành công', 'success');
      }
      loadData();
    } catch {
      show('Có lỗi xảy ra khi lưu báo cáo', 'error');
    } finally {
      setSaving(false);
      setConfirmPublishOpen(false);
    }
  };

  // Reset to default (delete saved report for this month)
  const handleResetReport = async () => {
    if (!isAdmin) return;
    try {
      await StorageService.deleteMonthlyReport(selectedYear, selectedMonth);
      show(`Đã đặt lại báo cáo tháng ${selectedMonth}/${selectedYear} về số liệu tự động`, 'info');
      setConfirmResetDefaultOpen(false);
      loadData();
    } catch (err) {
      show('Lỗi khi đặt lại báo cáo: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  // Excel Export: Current month report
  const handleExportCurrentMonth = () => {
    const data = [
      {
        'Chỉ tiêu': 'Kỳ báo cáo',
        'Giá trị': `${getMonthName(selectedMonth)} / ${selectedYear}`,
      },
      {
        'Chỉ tiêu': 'Trạng thái',
        'Giá trị': isPublished ? 'Đã xuất bản' : 'Dự thảo',
      },
      {
        'Chỉ tiêu': 'Tổng nhập kho (m³)',
        'Giá trị': numImportM3,
      },
      {
        'Chỉ tiêu': 'Tổng xuất kho (m³)',
        'Giá trị': numExportM3,
      },
      {
        'Chỉ tiêu': 'Doanh thu bán hàng (VNĐ)',
        'Giá trị': numRevenue,
      },
      {
        'Chỉ tiêu': '1. Giá vốn hàng bán (VNĐ)',
        'Giá trị': parseFloat(costs.cost_goods) || 0,
      },
      {
        'Chỉ tiêu': '2. Chi phí nhân công (VNĐ)',
        'Giá trị': parseFloat(costs.cost_labor) || 0,
      },
      {
        'Chỉ tiêu': '3. Tiền điện (VNĐ)',
        'Giá trị': parseFloat(costs.cost_electricity) || 0,
      },
      {
        'Chỉ tiêu': '4. Chi phí vốn (VNĐ)',
        'Giá trị': parseFloat(costs.cost_capital) || 0,
      },
      {
        'Chỉ tiêu': '5. Chi phí khác (VNĐ)',
        'Giá trị': parseFloat(costs.cost_other) || 0,
      },
      {
        'Chỉ tiêu': 'Tổng chi phí (VNĐ)',
        'Giá trị': totalCost,
      },
      {
        'Chỉ tiêu': 'Lợi nhuận ròng (VNĐ)',
        'Giá trị': calculatedProfit,
      },
      {
        'Chỉ tiêu': 'Tỷ suất lợi nhuận (%)',
        'Giá trị': `${profitMargin.toFixed(2)}%`,
      },
      {
        'Chỉ tiêu': 'Ghi chú',
        'Giá trị': reportNote || '(Không có)',
      },
      {
        'Chỉ tiêu': 'Người xuất bản / sửa đổi',
        'Giá trị': publishedBy || profile?.name || 'Quản trị viên',
      },
    ];

    exportToExcel(
      [{ name: `Thang_${selectedMonth}_${selectedYear}`, data }],
      `Bao_cao_doanh_thu_T${selectedMonth}_${selectedYear}`
    );
  };

  // Excel Export: All historical monthly reports
  const handleExportAllReports = () => {
    exportToExcel(
      [
        {
          name: 'Tong_hop_cac_thang',
          data: reports.map((r, idx) => ({
            STT: idx + 1,
            'Kỳ báo cáo': `${getMonthName(r.month)} / ${r.year}`,
            'Nhập kho (m³)': Number(r.total_import_m3),
            'Xuất kho (m³)': Number(r.total_export_m3),
            'Doanh thu (VNĐ)': Number(r.total_revenue),
            'Giá vốn (VNĐ)': Number(r.cost_goods),
            'Nhân công (VNĐ)': Number(r.cost_labor),
            'Tiền điện (VNĐ)': Number(r.cost_electricity),
            'Chi phí vốn (VNĐ)': Number(r.cost_capital),
            'Chi phí khác (VNĐ)': Number(r.cost_other),
            'Tổng chi phí (VNĐ)': Number(r.total_cost),
            'Lợi nhuận (VNĐ)': Number(r.profit),
            'Tỷ suất LN (%)':
              Number(r.total_revenue) > 0
                ? `${((Number(r.profit) / Number(r.total_revenue)) * 100).toFixed(1)}%`
                : '0%',
            'Trạng thái': r.finalized ? 'Đã xuất bản' : 'Dự thảo',
            'Người xuất bản': r.published_by || '',
            'Ghi chú': r.note || '',
          })),
        },
      ],
      'Tong_hop_bao_cao_tai_chinh'
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
              Báo cáo Doanh thu & Chi phí
            </h1>
            {isPublished && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={13} />
                Đã xuất bản
              </span>
            )}
            {!isPublished && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <FileText size={13} />
                Bản nháp
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản trị viên có toàn quyền chỉnh sửa các chỉ số và xuất bản báo cáo. Dữ liệu phiếu kho thực tế luôn được giữ nguyên vẹn.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleExportCurrentMonth}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-100 transition-colors shadow-sm bg-white"
            title="Xuất Excel tháng đang chọn"
          >
            <Download size={15} />
            <span>Xuất tháng này</span>
          </button>

          {reports.length > 0 && (
            <button
              onClick={handleExportAllReports}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-white text-xs sm:text-sm font-medium hover:bg-slate-900 transition-colors shadow-sm"
              title="Xuất Excel toàn bộ các tháng"
            >
              <FileSpreadsheet size={15} />
              <span>Xuất tất cả</span>
            </button>
          )}
        </div>
      </div>

      {/* Month & Year Selectors & Status Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <Calendar size={18} />
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => {
                const m = Number(e.target.value);
                setSelectedMonth(m);
                try {
                  localStorage.setItem('ht_report_month', String(m));
                } catch {}
              }}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 font-semibold bg-white focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m)}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => {
                const y = Number(e.target.value);
                setSelectedYear(y);
                try {
                  localStorage.setItem('ht_report_year', String(y));
                } catch {}
              }}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 font-semibold bg-white focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>

          {/* Published info or Draft info */}
          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
            {isPublished ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>
                  Đã xuất bản bởi <strong>{publishedBy || 'Quản trị viên'}</strong>
                  {publishedAt && ` lúc ${new Date(publishedAt).toLocaleDateString('vi-VN')}`}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 font-medium border border-amber-200">
                <AlertCircle size={14} className="text-amber-600" />
                <span>Chưa xuất bản (Bản dự thảo)</span>
              </span>
            )}

            {existingReportId && isAdmin && (
              <button
                type="button"
                onClick={() => setConfirmResetDefaultOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition-colors shadow-2xs"
                title="Xóa báo cáo tháng này để hệ thống và Tổng quan tính lại tự động từ phiếu kho"
              >
                <Trash2 size={13} />
                <span>Xóa báo cáo tháng này</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Warehouse Data Independence Banner */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-700 shrink-0" />
              <h2 className="text-sm font-bold text-blue-950">
                Dữ liệu thực tế từ phiếu kho tháng {selectedMonth}/{selectedYear}
              </h2>
            </div>
            <p className="text-xs text-blue-800/80 leading-relaxed max-w-3xl">
              Việc Quản trị viên sửa đổi số liệu bên dưới để xuất bản báo cáo tài chính là độc lập, <strong>hoàn toàn không ảnh hưởng hay thay đổi bất kỳ phiếu nhập/xuất kho thực tế nào</strong> trong hệ thống.
            </p>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-700 pt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 border border-blue-200/60 shadow-xs">
                Nhập thực tế: <strong className="text-emerald-700">{formatM3(actualStats.importM3)} m³</strong> ({actualStats.importCount} phiếu)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 border border-blue-200/60 shadow-xs">
                Xuất thực tế: <strong className="text-amber-700">{formatM3(actualStats.exportM3)} m³</strong> ({actualStats.exportCount} phiếu)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 border border-blue-200/60 shadow-xs">
                Doanh thu xuất thực tế: <strong className="text-violet-700">{formatVND(actualStats.revenue)}</strong>
              </span>
            </div>
          </div>

          {isAdmin && hasModifiedFigures && (
            <button
              type="button"
              onClick={handleResetToActual}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-blue-700 border border-blue-300 text-xs font-semibold hover:bg-blue-100 transition-colors shadow-xs shrink-0 self-start md:self-auto"
            >
              <RotateCcw size={14} />
              <span>Nạp lại số liệu từ phiếu gốc</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Main Edit & Publish Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Số liệu báo cáo tháng {getMonthName(selectedMonth)} / {selectedYear}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAdmin
                      ? 'Quản trị viên có thể chỉnh sửa trực tiếp Doanh thu, Thể tích và Chi phí để xuất bản ngay.'
                      : 'Chế độ chỉ xem. Chỉ Quản trị viên mới có thể chỉnh sửa và xuất bản báo cáo.'}
                  </p>
                </div>
              </div>

              {hasModifiedFigures && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 self-start sm:self-auto">
                  * Số liệu báo cáo đã được tùy chỉnh so với phiếu kho
                </span>
              )}
            </div>

            {/* PART 1: Core Revenue & Volume inputs */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                1. Doanh thu & Thể tích xuất bản
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Revenue */}
                <div className="p-4 rounded-2xl bg-violet-50/60 border border-violet-100">
                  <label className="block text-xs font-semibold text-violet-900 mb-1">
                    Tổng Doanh thu xuất bản (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-violet-600/80 mb-2">
                    Gốc từ phiếu xuất: {formatVND(actualStats.revenue)}
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={reportRevenue}
                      onChange={(e) => setReportRevenue(e.target.value)}
                      disabled={!isAdmin || saving}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-violet-200 bg-white text-base font-bold text-violet-950 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                  <p className="text-xs font-medium text-violet-800 mt-1.5 truncate">
                    Bằng chữ: <strong>{formatVND(numRevenue)}</strong>
                  </p>
                </div>

                {/* Import M3 */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <label className="block text-xs font-semibold text-emerald-900 mb-1">
                    Tổng Nhập kho xuất bản (m³) <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-emerald-600/80 mb-2">
                    Gốc từ phiếu nhập: {formatM3(actualStats.importM3)} m³
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={reportImportM3}
                      onChange={(e) => setReportImportM3(e.target.value)}
                      disabled={!isAdmin || saving}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-white text-base font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                  <p className="text-xs font-medium text-emerald-800 mt-1.5">
                    Thể tích: <strong>{formatM3(numImportM3)} m³</strong>
                  </p>
                </div>

                {/* Export M3 */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    Tổng Xuất kho xuất bản (m³) <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-amber-600/80 mb-2">
                    Gốc từ phiếu xuất: {formatM3(actualStats.exportM3)} m³
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={reportExportM3}
                      onChange={(e) => setReportExportM3(e.target.value)}
                      disabled={!isAdmin || saving}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-white text-base font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                  <p className="text-xs font-medium text-amber-800 mt-1.5">
                    Thể tích: <strong>{formatM3(numExportM3)} m³</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* PART 2: Operating & Manufacturing Costs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  2. Kê khai các khoản chi phí tháng
                </h4>
                <span className="text-xs font-semibold text-slate-500">
                  Tổng chi phí: <span className="text-rose-600 font-bold">{formatVND(totalCost)}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {costFields.map((field) => {
                  const Icon = field.icon;
                  const val = parseFloat(costs[field.key]) || 0;
                  return (
                    <div key={field.key} className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          {field.label}
                        </label>
                      </div>
                      <div className="relative">
                        <div
                          className={`absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg ${field.color}`}
                        >
                          <Icon size={14} />
                        </div>
                        <input
                          type="number"
                          step="1000"
                          min="0"
                          value={costs[field.key]}
                          onChange={(e) =>
                            setCosts({ ...costs, [field.key]: e.target.value })
                          }
                          disabled={!isAdmin || saving}
                          className="w-full pl-11 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 truncate">
                        {formatVND(val)}
                      </p>
                    </div>
                  );
                })}

                {/* Optional Note Field */}
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 sm:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ghi chú báo cáo xuất bản
                  </label>
                  <input
                    type="text"
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder="Ví dụ: Đã tính tiền điện bổ sung quý..."
                    disabled={!isAdmin || saving}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hiển thị trong file Excel & bản in
                  </p>
                </div>
              </div>
            </div>

            {/* PART 3: Financial Summary Cards */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                3. Kết quả tài chính tháng {selectedMonth}/{selectedYear}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-violet-700 uppercase">
                      Tổng Doanh thu
                    </span>
                    <TrendingUp size={16} className="text-violet-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-violet-900 mt-1 truncate">
                    {formatVND(numRevenue)}
                  </p>
                  <p className="text-[11px] text-violet-600/90 mt-1">
                    Xuất bán: {formatM3(numExportM3)} m³
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-700 uppercase">
                      Tổng Chi phí
                    </span>
                    <TrendingDown size={16} className="text-rose-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-rose-900 mt-1 truncate">
                    {formatVND(totalCost)}
                  </p>
                  <p className="text-[11px] text-rose-600/90 mt-1">
                    Bao gồm 5 mục chi phí
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    calculatedProfit >= 0
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold uppercase ${
                        calculatedProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      Lợi nhuận ròng
                    </span>
                    <DollarSign
                      size={16}
                      className={calculatedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}
                    />
                  </div>
                  <p
                    className={`text-xl sm:text-2xl font-black mt-1 truncate ${
                      calculatedProfit >= 0 ? 'text-emerald-900' : 'text-red-900'
                    }`}
                  >
                    {formatVND(calculatedProfit)}
                  </p>
                  <p
                    className={`text-[11px] font-semibold mt-1 ${
                      calculatedProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    Tỷ suất lợi nhuận: {profitMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* PART 4: Action Buttons (Admin Only) */}
            {isAdmin ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  {isPublished ? (
                    <span className="text-emerald-700 font-medium">
                      Báo cáo này đã xuất bản. Bạn có thể sửa đổi bất kỳ lúc nào và bấm cập nhật lại.
                    </span>
                  ) : (
                    <span>Báo cáo đang ở dạng Dự thảo. Bạn có thể bấm Xuất bản luôn để công bố.</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Save draft */}
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-xs"
                  >
                    <Save size={15} />
                    <span>{saving ? 'Đang lưu...' : 'Lưu dự thảo'}</span>
                  </button>

                  {/* Publish / Republish */}
                  <button
                    type="button"
                    onClick={() => setConfirmPublishOpen(true)}
                    disabled={saving}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <Send size={15} />
                    <span>{isPublished ? 'Cập nhật & Xuất bản lại' : 'Lưu & Xuất bản ngay'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200">
                <Lock size={15} className="text-slate-400 shrink-0" />
                <span>
                  Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa số liệu và xuất bản báo cáo. Nhân viên xem số liệu đã xuất bản.
                </span>
              </div>
            )}
          </div>

          {/* History Reports Table */}
          {reports.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    Lịch sử báo cáo các kỳ
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bấm vào kỳ bất kỳ để xem chi tiết hoặc chỉnh sửa và xuất bản lại
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg self-start sm:self-auto">
                  Tổng {reports.length} kỳ báo cáo
                </span>
              </div>

              {/* MOBILE VIEW */}
              <div className="block sm:hidden divide-y divide-slate-100">
                {reports.map((rep) => {
                  const isCurrent = rep.year === selectedYear && rep.month === selectedMonth;
                  return (
                    <div
                      key={rep.id}
                      onClick={() => {
                        setSelectedYear(rep.year);
                        setSelectedMonth(rep.month);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`p-4 space-y-2 cursor-pointer transition-colors ${
                        isCurrent ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">
                          {getMonthName(rep.month)} / {rep.year}
                        </span>
                        {rep.finalized ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 size={11} />
                            Đã xuất bản
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-100 text-amber-800">
                            Dự thảo
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                        <div>
                          Doanh thu: <strong className="text-violet-700">{formatVND(rep.total_revenue)}</strong>
                        </div>
                        <div>
                          Chi phí: <strong className="text-rose-700">{formatVND(rep.total_cost)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-xs text-slate-400 uppercase font-semibold">Lợi nhuận</span>
                        <span
                          className={`text-sm font-black ${
                            rep.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {formatVND(rep.profit)}
                        </span>
                      </div>

                      {rep.note && (
                        <p className="text-[11px] text-slate-500 italic truncate">
                          Ghi chú: {rep.note}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Kỳ báo cáo
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Nhập (m³)
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Xuất (m³)
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Doanh thu
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Chi phí
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Lợi nhuận
                      </th>
                      <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.map((rep) => {
                      const isCurrent = rep.year === selectedYear && rep.month === selectedMonth;
                      return (
                        <tr
                          key={rep.id}
                          className={`transition-colors ${
                            isCurrent ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-5 py-4 text-sm font-bold text-slate-800">
                            <div>{getMonthName(rep.month)} / {rep.year}</div>
                            {rep.published_by && (
                              <div className="text-[11px] text-slate-400 font-normal">
                                Bởi: {rep.published_by}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-sm text-right text-emerald-600 font-medium">
                            {formatM3(rep.total_import_m3)}
                          </td>
                          <td className="px-5 py-4 text-sm text-right text-amber-600 font-medium">
                            {formatM3(rep.total_export_m3)}
                          </td>
                          <td className="px-5 py-4 text-sm text-right text-violet-600 font-semibold">
                            {formatVND(rep.total_revenue)}
                          </td>
                          <td className="px-5 py-4 text-sm text-right text-rose-600 font-medium">
                            {formatVND(rep.total_cost)}
                          </td>
                          <td
                            className={`px-5 py-4 text-sm text-right font-bold ${
                              rep.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            <div>{formatVND(rep.profit)}</div>
                            <div className="text-[10px] font-normal text-slate-400">
                              {rep.total_revenue > 0
                                ? `${((rep.profit / rep.total_revenue) * 100).toFixed(1)}%`
                                : '0%'}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {rep.finalized ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 size={13} />
                                <span>Đã xuất bản</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Dự thảo
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedYear(rep.year);
                                  setSelectedMonth(rep.month);
                                  try {
                                    localStorage.setItem('ht_report_year', String(rep.year));
                                    localStorage.setItem('ht_report_month', String(rep.month));
                                  } catch {}
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                              >
                                {isCurrent ? 'Đang chọn' : 'Xem & Sửa'}
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingReport(rep)}
                                  className="p-1.5 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                  title="Xóa báo cáo này"
                                >
                                  <Trash2 size={15} />
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
          )}
        </>
      )}

      {/* Confirm Publish Modal */}
      <ConfirmModal
        open={confirmPublishOpen}
        onClose={() => setConfirmPublishOpen(false)}
        onConfirm={() => handleSave(true)}
        title="Xuất bản Báo cáo Doanh thu & Chi phí"
        message={`Xác nhận xuất bản báo cáo ${getMonthName(selectedMonth)} / ${selectedYear}? Doanh thu: ${formatVND(numRevenue)}, Lợi nhuận: ${formatVND(calculatedProfit)}. Dữ liệu các phiếu kho thực tế hoàn toàn không bị ảnh hưởng.`}
        confirmText={isPublished ? 'Cập nhật & Xuất bản' : 'Xuất bản ngay'}
      />

      {/* Confirm Reset to Default Modal */}
      <ConfirmModal
        open={confirmResetDefaultOpen}
        onClose={() => setConfirmResetDefaultOpen(false)}
        onConfirm={handleResetReport}
        title="Xóa báo cáo tháng này"
        message={`Bạn có chắc muốn xóa bản lưu báo cáo ${getMonthName(selectedMonth)} / ${selectedYear}? Hệ thống và Tổng quan sẽ khôi phục tính toán tự động từ phiếu nhập/xuất thực tế.`}
        confirmText="Xác nhận xóa"
        danger
      />

      {/* Confirm Delete Single Report From Table Modal */}
      <ConfirmModal
        open={Boolean(deletingReport)}
        onClose={() => setDeletingReport(null)}
        onConfirm={handleDeleteReportFromTable}
        title={`Xóa báo cáo tháng ${deletingReport?.month}/${deletingReport?.year}`}
        message={`Bạn có chắc muốn xóa vĩnh viễn báo cáo tháng ${deletingReport?.month}/${deletingReport?.year}? Dữ liệu sẽ được xóa khỏi bảng báo cáo và Tổng quan sẽ khôi phục tính toán tự động theo phiếu kho.`}
        confirmText="Xóa báo cáo"
        danger
      />
    </div>
  );
}
