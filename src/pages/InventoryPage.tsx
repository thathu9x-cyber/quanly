import React, { useState, useEffect } from 'react';
import { Warehouse, Download, Search, Package, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { StorageService } from '../services/storage';
import { formatM3 } from '../utils/formatters';
import { exportToExcel } from '../utils/excel';
import { EmptyState } from '../components/EmptyState';
import { InventoryItem } from '../types';

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadInventory = () => {
    setLoading(true);
    const products = StorageService.getProducts();
    const imports = StorageService.getImports();
    const exports = StorageService.getExports();

    const result: InventoryItem[] = products.map((p) => {
      const totalImportM3 = imports
        .filter((i) => i.product_id === p.id)
        .reduce((sum, i) => sum + Number(i.total_m3 || 0), 0);

      const totalExportM3 = exports
        .filter((e) => e.product_id === p.id)
        .reduce((sum, e) => sum + Number(e.total_m3 || 0), 0);

      return {
        product_id: p.id,
        product_name: p.name,
        product_size: p.size,
        conversion_coefficient: p.conversion_coefficient,
        total_import_m3: totalImportM3,
        total_export_m3: totalExportM3,
        remaining_m3: totalImportM3 - totalExportM3,
      };
    });

    setItems(result);
    setLoading(false);
  };

  useEffect(() => {
    loadInventory();

    const handleStorageChange = () => {
      loadInventory();
    };

    window.addEventListener('app-storage-changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('app-storage-changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const filteredItems = items.filter(
    (item) =>
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      item.product_size.toLowerCase().includes(search.toLowerCase())
  );

  const totalImportSum = filteredItems.reduce((sum, i) => sum + i.total_import_m3, 0);
  const totalExportSum = filteredItems.reduce((sum, i) => sum + i.total_export_m3, 0);
  const totalRemainingSum = filteredItems.reduce((sum, i) => sum + i.remaining_m3, 0);

  const handleExportExcel = () => {
    exportToExcel(
      [
        {
          name: 'Ton_kho',
          data: filteredItems.map((item, idx) => ({
            STT: idx + 1,
            'Tên hàng': item.product_name,
            'Kích thước': item.product_size,
            'Hệ số QĐ': item.conversion_coefficient,
            'Nhập (m³)': Number(item.total_import_m3),
            'Xuất (m³)': Number(item.total_export_m3),
            'Tồn (m³)': Number(item.remaining_m3),
          })),
        },
      ],
      'Ton_kho'
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Tồn kho hiện tại</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tổng hợp hàng tồn kho thực tế tính theo m³
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-100 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Download size={16} />
            <span>Xuất Excel</span>
          </button>
        )}
      </div>

      {/* 3 Summary Stats Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-sm font-medium text-slate-500 truncate">Tổng nhập</p>
          <p className="text-base sm:text-2xl font-bold text-emerald-600 mt-0.5 truncate">
            {formatM3(totalImportSum)}{' '}
            <span className="text-xs sm:text-base font-normal">m³</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-sm font-medium text-slate-500 truncate">Tổng xuất</p>
          <p className="text-base sm:text-2xl font-bold text-amber-600 mt-0.5 truncate">
            {formatM3(totalExportSum)}{' '}
            <span className="text-xs sm:text-base font-normal">m³</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-sm">
          <p className="text-[11px] sm:text-sm font-medium text-slate-500 truncate">Tổng tồn kho</p>
          <p
            className={`text-base sm:text-2xl font-extrabold mt-0.5 truncate ${
              totalRemainingSum >= 0 ? 'text-blue-600' : 'text-rose-600'
            }`}
          >
            {formatM3(totalRemainingSum)}{' '}
            <span className="text-xs sm:text-base font-normal">m³</span>
          </p>
        </div>
      </div>

      {/* Search */}
      {items.length > 0 && (
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc quy cách..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      )}

      {/* Content List: MOBILE (3 Thông tin cốt lõi) vs DESKTOP (Bảng) */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={<Warehouse size={40} />}
            title={search ? 'Không tìm thấy sản phẩm tồn kho' : 'Chưa có dữ liệu tồn kho'}
            description={
              search ? 'Thử từ khóa khác' : 'Thêm sản phẩm và tạo phiếu nhập để bắt đầu theo dõi'
            }
          />
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: 3 THÔNG TIN CỐT LÕI (Sản phẩm, Nhập/Xuất m³, Tồn kho m³) */}
          <div className="block sm:hidden space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Mặt hàng ({filteredItems.length})
              </span>
              <span className="text-[11px] text-slate-400">3 thông tin cốt lõi</span>
            </div>

            {filteredItems.map((item) => (
              <div
                key={item.product_id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2.5"
              >
                {/* 1. Sản phẩm & Quy cách */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Package size={15} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 leading-snug truncate">
                        {item.product_name}
                      </h3>
                    </div>
                    {item.product_size && (
                      <p className="text-xs text-slate-500 mt-1 pl-9 truncate">
                        Quy cách: {item.product_size}
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Nhập & Xuất m³ và 3. Tồn kho m³ */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Tổng Nhập / Xuất
                    </span>
                    <div className="text-xs font-medium text-slate-700 mt-0.5 space-y-0.5">
                      <p className="text-emerald-700">
                        Nhập: {formatM3(item.total_import_m3, 3)} m³
                      </p>
                      <p className="text-amber-700">
                        Xuất: {formatM3(item.total_export_m3, 3)} m³
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Tồn kho thực tế
                    </span>
                    <p
                      className={`text-lg font-black mt-0.5 ${
                        item.remaining_m3 > 0
                          ? 'text-blue-700'
                          : item.remaining_m3 === 0
                          ? 'text-slate-500'
                          : 'text-rose-600'
                      }`}
                    >
                      {formatM3(item.remaining_m3, 3)}{' '}
                      <span className="text-xs font-semibold text-slate-500">m³</span>
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
                      Tên hàng
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Kích thước
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Hệ số QĐ
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tổng nhập (m³)
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tổng xuất (m³)
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tồn kho (m³)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item, idx) => (
                    <tr key={item.product_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <Package size={18} />
                          </div>
                          <span className="text-sm font-semibold text-slate-800">
                            {item.product_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {item.product_size || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-slate-500">
                        {formatM3(item.conversion_coefficient, 4)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-emerald-600">
                        {formatM3(item.total_import_m3, 3)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-amber-600">
                        {formatM3(item.total_export_m3, 3)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span
                          className={`font-bold px-3 py-1 rounded-lg ${
                            item.remaining_m3 > 0
                              ? 'text-blue-700 bg-blue-50'
                              : item.remaining_m3 === 0
                              ? 'text-slate-600 bg-slate-100'
                              : 'text-red-700 bg-red-50'
                          }`}
                        >
                          {formatM3(item.remaining_m3, 3)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
