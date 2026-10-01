import { useState, useEffect } from 'react';
import {
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Warehouse,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  DollarSign,
  AlertCircle,
  Receipt,
  CheckCircle2,
  FileText,
  RotateCcw,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StorageService } from '../services/storage';
import { formatM3, formatVND, getMonthName } from '../utils/formatters';
import { exportToExcel } from '../utils/excel';
import { MonthlyReport, ImportRecord, ExportRecord } from '../types';

interface MonthlyDataItem {
  month: number;
  importM3: number;
  exportM3: number;
  revenue: number;
  isFromReport: boolean;
  finalized?: boolean;
}

interface DashboardData {
  productCount: number;
  remainingM3: number;
  selectedYear: number;
  selectedMonth: number;
  importM3: number;
  exportM3: number;
  revenue: number;
  profit: number;
  totalCost: number;
  hasReport: boolean;
  isPublished: boolean;
  publishedBy?: string;
  sourceLabel: string;
  // Actual slip figures
  actualSlipImportM3: number;
  actualSlipExportM3: number;
  actualSlipRevenue: number;
  actualSlipImportCount: number;
  actualSlipExportCount: number;
  // Recent records & 12 months
  recentImports: ImportRecord[];
  recentExports: ExportRecord[];
  monthlyData: MonthlyDataItem[];
}

export function DashboardPage() {
  const { canEdit } = useAuth();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ht_dashboard_year') || localStorage.getItem('ht_report_year');
      if (saved) return parseInt(saved, 10);
    } catch {}
    return currentYear;
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ht_dashboard_month') || localStorage.getItem('ht_report_month');
      if (saved) return parseInt(saved, 10);
    } catch {}
    return currentMonth;
  });

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const isCurrentMonth = selectedYear === currentYear && selectedMonth === currentMonth;

  const loadData = () => {
    setLoading(true);

    const products = StorageService.getProducts();
    const imports = StorageService.getImports();
    const exports = StorageService.getExports();
    const reports = StorageService.getMonthlyReports();

    // 1. Calculate actual slip figures for selected year & month
    const slipsImportMonth = imports.filter((i) => {
      const d = new Date(i.import_date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });
    const actualSlipImportM3 = slipsImportMonth.reduce(
      (sum, i) => sum + Number(i.total_m3 || 0),
      0
    );

    const slipsExportMonth = exports.filter((e) => {
      const d = new Date(e.export_date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });
    const actualSlipExportM3 = slipsExportMonth.reduce(
      (sum, e) => sum + Number(e.total_m3 || 0),
      0
    );
    const actualSlipRevenue = slipsExportMonth.reduce(
      (sum, e) => sum + Number(e.revenue || 0),
      0
    );

    // 2. Check if a MonthlyReport exists for selected year & month
    const matchingReport = reports.find(
      (r) => r.year === selectedYear && r.month === selectedMonth
    );

    // Synchronized figures: prioritize report if saved/published, otherwise fall back to slip data
    let importM3 = actualSlipImportM3;
    let exportM3 = actualSlipExportM3;
    let revenue = actualSlipRevenue;
    let profit = actualSlipRevenue;
    let totalCost = 0;
    const hasReport = Boolean(matchingReport);
    const isPublished = Boolean(matchingReport?.finalized);
    const publishedBy = matchingReport?.published_by;
    let sourceLabel = 'Tự động từ phiếu kho thực tế';

    if (matchingReport) {
      importM3 = Number(matchingReport.total_import_m3);
      exportM3 = Number(matchingReport.total_export_m3);
      revenue = Number(matchingReport.total_revenue);
      profit = Number(matchingReport.profit);
      totalCost = Number(matchingReport.total_cost);
      sourceLabel = matchingReport.finalized
        ? `Báo cáo đã xuất bản (${matchingReport.published_by || 'Quản trị viên'})`
        : 'Bản dự thảo báo cáo tài chính';
    }

    // 3. Lifetime remaining inventory
    const totalImportAll = imports.reduce((sum, i) => sum + Number(i.total_m3 || 0), 0);
    const totalExportAll = exports.reduce((sum, e) => sum + Number(e.total_m3 || 0), 0);
    const remainingM3 = totalImportAll - totalExportAll;

    // 4. Monthly data 12 months for selectedYear (synchronized with reports)
    const monthlyData: MonthlyDataItem[] = [];
    for (let m = 1; m <= 12; m++) {
      const rep = reports.find((r) => r.year === selectedYear && r.month === m);

      const impM = imports
        .filter((i) => {
          const d = new Date(i.import_date);
          return d.getFullYear() === selectedYear && d.getMonth() + 1 === m;
        })
        .reduce((sum, i) => sum + Number(i.total_m3 || 0), 0);

      const expM = exports
        .filter((e) => {
          const d = new Date(e.export_date);
          return d.getFullYear() === selectedYear && d.getMonth() + 1 === m;
        })
        .reduce((sum, e) => sum + Number(e.total_m3 || 0), 0);

      const revM = exports
        .filter((e) => {
          const d = new Date(e.export_date);
          return d.getFullYear() === selectedYear && d.getMonth() + 1 === m;
        })
        .reduce((sum, e) => sum + Number(e.revenue || 0), 0);

      // If report exists for this month, use report figures, otherwise use actual slip sums
      monthlyData.push({
        month: m,
        importM3: rep ? Number(rep.total_import_m3) : impM,
        exportM3: rep ? Number(rep.total_export_m3) : expM,
        revenue: rep ? Number(rep.total_revenue) : revM,
        isFromReport: Boolean(rep),
        finalized: rep?.finalized,
      });
    }

    // 5. Recent 5 imports & exports
    const recentImports = [...imports]
      .sort((a, b) => new Date(b.import_date).getTime() - new Date(a.import_date).getTime())
      .slice(0, 5);

    const recentExports = [...exports]
      .sort((a, b) => new Date(b.export_date).getTime() - new Date(a.export_date).getTime())
      .slice(0, 5);

    setData({
      productCount: products.length,
      remainingM3,
      selectedYear,
      selectedMonth,
      importM3,
      exportM3,
      revenue,
      profit,
      totalCost,
      hasReport,
      isPublished,
      publishedBy,
      sourceLabel,
      actualSlipImportM3,
      actualSlipExportM3,
      actualSlipRevenue,
      actualSlipImportCount: slipsImportMonth.length,
      actualSlipExportCount: slipsExportMonth.length,
      recentImports,
      recentExports,
      monthlyData,
    });
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // Listen to real-time storage events from any tab (creating, updating, or deleting records/reports)
    const handleStorageChange = () => {
      loadData();
    };

    window.addEventListener('app-storage-changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('app-storage-changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [selectedYear, selectedMonth]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const maxVolume = Math.max(...data.monthlyData.map((d) => Math.max(d.importM3, d.exportM3)), 1);
  const maxRevenue = Math.max(...data.monthlyData.map((d) => d.revenue), 1);

  const statsCards = [
    {
      label: 'Sản phẩm danh mục',
      value: formatM3(data.productCount, 0),
      subtitle: 'Quy cách & mã hàng',
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
    },
    {
      label: `Tồn kho hiện tại`,
      value: formatM3(data.remainingM3) + ' m³',
      subtitle: 'Lũy kế toàn bộ kho',
      icon: Warehouse,
      color: 'from-slate-600 to-slate-700',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
    },
    {
      label: `Doanh thu ${getMonthName(selectedMonth)}/${selectedYear}`,
      value: formatVND(data.revenue),
      subtitle: data.hasReport
        ? data.isPublished
          ? 'Đã xuất bản'
          : 'Bản dự thảo'
        : 'Theo phiếu xuất kho',
      icon: DollarSign,
      color: 'from-violet-500 to-violet-600',
      bg: 'bg-violet-50',
      text: 'text-violet-600',
    },
    {
      label: `Lợi nhuận ${getMonthName(selectedMonth)}/${selectedYear}`,
      value: data.hasReport ? formatVND(data.profit) : formatVND(data.actualSlipRevenue),
      subtitle: data.hasReport
        ? `Tỷ suất: ${data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) : 0}%`
        : 'Ước tính theo phiếu xuất',
      icon: data.profit >= 0 ? TrendingUp : TrendingDown,
      color: data.profit >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-rose-500 to-rose-600',
      bg: data.profit >= 0 ? 'bg-emerald-50' : 'bg-rose-50',
      text: data.profit >= 0 ? 'text-emerald-600' : 'text-rose-600',
    },
    {
      label: `Nhập kho ${getMonthName(selectedMonth)}/${selectedYear}`,
      value: formatM3(data.importM3) + ' m³',
      subtitle: data.hasReport ? 'Số liệu báo cáo' : `${data.actualSlipImportCount} phiếu nhập`,
      icon: ArrowDownToLine,
      color: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    {
      label: `Xuất kho ${getMonthName(selectedMonth)}/${selectedYear}`,
      value: formatM3(data.exportM3) + ' m³',
      subtitle: data.hasReport ? 'Số liệu báo cáo' : `${data.actualSlipExportCount} phiếu xuất`,
      icon: ArrowUpFromLine,
      color: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
    },
  ];

  const handleExportExcel = () => {
    exportToExcel(
      [
        {
          name: `Tong_quan_${selectedMonth}_${selectedYear}`,
          data: [
            {
              'Chỉ tiêu': `Kỳ tổng quan`,
              'Giá trị': `${getMonthName(selectedMonth)} / ${selectedYear}`,
            },
            {
              'Chỉ tiêu': 'Trạng thái dữ liệu',
              'Giá trị': data.sourceLabel,
            },
            {
              'Chỉ tiêu': 'Tổng doanh thu',
              'Giá trị': data.revenue,
            },
            {
              'Chỉ tiêu': 'Tổng lợi nhuận',
              'Giá trị': data.profit,
            },
            {
              'Chỉ tiêu': 'Tổng chi phí',
              'Giá trị': data.totalCost,
            },
            {
              'Chỉ tiêu': 'Nhập kho (m³)',
              'Giá trị': data.importM3,
            },
            {
              'Chỉ tiêu': 'Xuất kho (m³)',
              'Giá trị': data.exportM3,
            },
            {
              'Chỉ tiêu': 'Tồn kho lũy kế (m³)',
              'Giá trị': data.remainingM3,
            },
          ],
        },
        {
          name: `12_thang_${selectedYear}`,
          data: data.monthlyData.map((d) => ({
            Tháng: `${getMonthName(d.month)} / ${selectedYear}`,
            'Nhập kho (m³)': d.importM3,
            'Xuất kho (m³)': d.exportM3,
            'Doanh thu (VNĐ)': d.revenue,
            'Nguồn dữ liệu': d.isFromReport
              ? d.finalized
                ? 'Báo cáo đã xuất bản'
                : 'Báo cáo dự thảo'
              : 'Phiếu kho thực tế',
          })),
        },
        {
          name: 'Nhap_kho_gan_day',
          data: data.recentImports.map((imp, idx) => ({
            STT: idx + 1,
            'Tên hàng': imp.products?.name || '',
            'Ngày nhập': new Date(imp.import_date).toLocaleDateString('vi-VN'),
            'Số lượt': Number(imp.so_luot),
            'Tổng m³': Number(imp.total_m3),
          })),
        },
        {
          name: 'Xuat_kho_gan_day',
          data: data.recentExports.map((exp, idx) => ({
            STT: idx + 1,
            'Tên hàng': exp.products?.name || '',
            'Ngày xuất': new Date(exp.export_date).toLocaleDateString('vi-VN'),
            'Số lượt': Number(exp.so_luot),
            'Tổng m³': Number(exp.total_m3),
            'Doanh thu': Number(exp.revenue),
          })),
        },
      ],
      `Tong_quan_${selectedMonth}_${selectedYear}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-800">Tổng quan</h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Đồng bộ dữ liệu thời gian thực
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Bảng điều khiển trung tâm đồng bộ tức thời số liệu từ Nhập kho, Xuất kho và Báo cáo tài chính.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Month & Year pickers */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="p-1.5 text-blue-600">
              <Calendar size={16} />
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => {
                const m = Number(e.target.value);
                setSelectedMonth(m);
                try {
                  localStorage.setItem('ht_dashboard_month', String(m));
                  localStorage.setItem('ht_report_month', String(m));
                } catch {}
              }}
              className="text-xs sm:text-sm font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m)}
                </option>
              ))}
            </select>

            <span className="text-slate-300">/</span>

            <select
              value={selectedYear}
              onChange={(e) => {
                const y = Number(e.target.value);
                setSelectedYear(y);
                try {
                  localStorage.setItem('ht_dashboard_year', String(y));
                  localStorage.setItem('ht_report_year', String(y));
                } catch {}
              }}
              className="text-xs sm:text-sm font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              {Array.from({ length: 6 }, (_, i) => currentYear - 2 + i).map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>

          {/* Quick button to return to current month if changed */}
          {!isCurrentMonth && (
            <button
              onClick={() => {
                setSelectedYear(currentYear);
                setSelectedMonth(currentMonth);
                try {
                  localStorage.setItem('ht_dashboard_year', String(currentYear));
                  localStorage.setItem('ht_dashboard_month', String(currentMonth));
                  localStorage.setItem('ht_report_year', String(currentYear));
                  localStorage.setItem('ht_report_month', String(currentMonth));
                } catch {}
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
              title="Xem tháng hiện tại"
            >
              <RotateCcw size={13} />
              <span>Về tháng này</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-100 transition-colors shadow-2xs bg-white"
          >
            <Download size={16} />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Synchronization Status Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                data.hasReport
                  ? data.isPublished
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              {data.hasReport ? (
                data.isPublished ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <FileText size={20} />
                )
              ) : (
                <ShieldCheck size={20} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-800">
                  Kỳ {getMonthName(selectedMonth)} / {selectedYear}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    data.hasReport
                      ? data.isPublished
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {data.hasReport
                    ? data.isPublished
                      ? 'Báo cáo tài chính đã xuất bản'
                      : 'Báo cáo tài chính dự thảo'
                    : 'Tự động từ phiếu kho thực tế'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {data.hasReport
                  ? `Số liệu trên Tổng quan đang được đồng bộ theo bản báo cáo tài chính ${
                      data.publishedBy ? `(Người lập: ${data.publishedBy})` : ''
                    }. Nếu xóa báo cáo, hệ thống sẽ tự động chuyển về tính từ phiếu kho.`
                  : `Chưa có báo cáo tài chính riêng cho kỳ này (hoặc đã xóa). Số liệu được tính toán trực tiếp từ các phiếu nhập/xuất kho thực tế.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 shrink-0 self-start sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div>
              Gốc phiếu xuất:{' '}
              <strong className="text-violet-700 font-bold">{formatVND(data.actualSlipRevenue)}</strong>
            </div>
            <div>
              Xuất thực tế:{' '}
              <strong className="text-amber-700 font-bold">{formatM3(data.actualSlipExportM3)} m³</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statsCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200 shadow-2xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                  <p className="text-xs text-slate-400 font-medium mt-1">{card.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl ${card.bg}`}>
                  <Icon size={22} className={card.text} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dual Monthly Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Imports & Exports chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Nhập / Xuất kho 12 tháng ({selectedYear})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Đồng bộ số liệu đã xuất bản hoặc theo phiếu thực tế
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 text-slate-600">
              <BarChart3 size={18} />
            </div>
          </div>

          <div className="flex items-end gap-2 h-56 pt-6">
            {data.monthlyData.map((d) => {
              const isSelected = d.month === selectedMonth;
              return (
                <div
                  key={d.month}
                  onClick={() => setSelectedMonth(d.month)}
                  className={`flex-1 flex flex-col items-center gap-1 h-full cursor-pointer rounded-lg p-0.5 transition-colors ${
                    isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                  title={`Nhấp để xem chi tiết ${getMonthName(d.month)}`}
                >
                  <div className="w-full flex items-end justify-center h-full gap-1">
                    {/* Import Bar */}
                    <div
                      className="w-full max-w-[18px] bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md transition-all hover:opacity-80 relative group"
                      style={{
                        height: `${(d.importM3 / maxVolume) * 100}%`,
                        minHeight: d.importM3 > 0 ? '4px' : '0',
                      }}
                    >
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs bg-slate-800 text-white px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 whitespace-nowrap font-medium pointer-events-none z-20">
                        {formatM3(d.importM3)} m³ {d.isFromReport ? '(Báo cáo)' : '(Phiếu)'}
                      </span>
                    </div>
                    {/* Export Bar */}
                    <div
                      className="w-full max-w-[18px] bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-md transition-all hover:opacity-80 relative group"
                      style={{
                        height: `${(d.exportM3 / maxVolume) * 100}%`,
                        minHeight: d.exportM3 > 0 ? '4px' : '0',
                      }}
                    >
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs bg-slate-800 text-white px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 whitespace-nowrap font-medium pointer-events-none z-20">
                        {formatM3(d.exportM3)} m³ {d.isFromReport ? '(Báo cáo)' : '(Phiếu)'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium ${
                      isSelected ? 'text-blue-600 font-bold' : 'text-slate-400'
                    }`}
                  >
                    T{d.month}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 text-xs font-medium pt-3 border-t border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-600">Nhập kho (m³)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span className="text-slate-600">Xuất kho (m³)</span>
              </div>
            </div>
            <span className="text-slate-400 text-[11px]">Nhấp vào cột tháng để lọc</span>
          </div>
        </div>

        {/* Revenue chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Doanh thu 12 tháng ({selectedYear})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Doanh thu xuất kho thực tế & các kỳ đã xuất bản
              </p>
            </div>
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
              <DollarSign size={18} />
            </div>
          </div>

          <div className="flex items-end gap-2 h-56 pt-6">
            {data.monthlyData.map((d) => {
              const isSelected = d.month === selectedMonth;
              return (
                <div
                  key={d.month}
                  onClick={() => setSelectedMonth(d.month)}
                  className={`flex-1 flex flex-col items-center gap-1 h-full cursor-pointer rounded-lg p-0.5 transition-colors ${
                    isSelected ? 'bg-violet-50/70' : 'hover:bg-slate-50'
                  }`}
                  title={`Nhấp để xem chi tiết ${getMonthName(d.month)}`}
                >
                  <div className="w-full flex items-end justify-center h-full">
                    <div
                      className={`w-full max-w-[22px] rounded-t-md transition-all hover:opacity-80 relative group ${
                        d.isFromReport
                          ? 'bg-gradient-to-t from-violet-600 to-indigo-500'
                          : 'bg-gradient-to-t from-violet-400 to-violet-300'
                      }`}
                      style={{
                        height: `${(d.revenue / maxRevenue) * 100}%`,
                        minHeight: d.revenue > 0 ? '4px' : '0',
                      }}
                    >
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs bg-slate-800 text-white px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 whitespace-nowrap font-medium pointer-events-none z-20">
                        {formatVND(d.revenue)} {d.isFromReport ? '(Báo cáo)' : '(Phiếu)'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium ${
                      isSelected ? 'text-violet-600 font-bold' : 'text-slate-400'
                    }`}
                  >
                    T{d.month}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 text-xs font-medium pt-3 border-t border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-violet-600" />
                <span className="text-slate-600">Đã lập báo cáo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-violet-300" />
                <span className="text-slate-600">Theo phiếu xuất</span>
              </div>
            </div>
            <span className="text-slate-400 text-[11px]">Nhấp vào cột tháng để lọc</span>
          </div>
        </div>
      </div>

      {/* Recent Imports & Exports Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Imports */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800">Nhập kho gần đây</h3>
            <span className="text-xs text-slate-400">5 phiếu mới nhất</span>
          </div>

          {data.recentImports.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-2">
              {data.recentImports.map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                      <ArrowDownToLine size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {imp.products?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(imp.import_date).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {formatM3(imp.total_m3)} m³
                    </p>
                    <p className="text-xs text-slate-400">{formatM3(imp.so_luot, 0)} lượt</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Exports */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800">Xuất kho gần đây</h3>
            <span className="text-xs text-slate-400">5 phiếu mới nhất</span>
          </div>

          {data.recentExports.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-2">
              {data.recentExports.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-600 shrink-0">
                      <ArrowUpFromLine size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {exp.products?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(exp.export_date).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {formatM3(exp.total_m3)} m³
                    </p>
                    <p className="text-xs text-emerald-600 font-semibold">
                      {formatVND(exp.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Read-only banner if user role is xem */}
      {!canEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600 shrink-0">
            <AlertCircle size={20} />
          </div>
          <p className="text-sm text-blue-700">
            Tài khoản của bạn có quyền xem báo cáo & dữ liệu thống kê. Chức năng chỉnh sửa chỉ dành cho Quản trị viên và Nhân viên nghiệp vụ.
          </p>
        </div>
      )}
    </div>
  );
}
