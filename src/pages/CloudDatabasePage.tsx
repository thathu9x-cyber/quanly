import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  Download,
  Upload,
  Server,
  Database,
  Terminal,
  FileCode,
  Globe,
  HardDrive,
  Check,
  Copy,
  Layers,
  AlertCircle,
  Apple,
  Smartphone,
  Share,
  PlusSquare,
  Sparkles,
} from 'lucide-react';
import { StorageService, CloudSyncStatus } from '../services/storage';
import { useToast } from '../context/ToastContext';

export function CloudDatabasePage() {
  const { show } = useToast();
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(() => StorageService.getCloudSyncStatus());
  const [dataCounts, setDataCounts] = useState(() => ({
    products: StorageService.getProducts().length,
    imports: StorageService.getImports().length,
    exports: StorageService.getExports().length,
    reports: StorageService.getMonthlyReports().length,
    accounts: StorageService.getPinAccounts().length,
    logs: StorageService.getAuditLogs().length,
  }));
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [iosTab, setIosTab] = useState<'pwa' | 'native'>('pwa');

  const refreshStatus = () => {
    setSyncStatus(StorageService.getCloudSyncStatus());
    setDataCounts({
      products: StorageService.getProducts().length,
      imports: StorageService.getImports().length,
      exports: StorageService.getExports().length,
      reports: StorageService.getMonthlyReports().length,
      accounts: StorageService.getPinAccounts().length,
      logs: StorageService.getAuditLogs().length,
    });
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    const handleStorageChange = () => refreshStatus();
    window.addEventListener('app-storage-changed', handleStorageChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('app-storage-changed', handleStorageChange);
    };
  }, []);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const res = await StorageService.forceSyncAllToCloud();
      refreshStatus();
      if (res.success) {
        show(res.message, 'success');
      } else {
        show(res.message, 'error');
      }
    } catch (err: any) {
      show('Lỗi khi đồng bộ: ' + (err?.message || 'Không xác định'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const jsonStr = StorageService.exportFullBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hung_thinh_cqt_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      show('Đã tải tệp sao lưu JSON thành công!', 'success');
    } catch {
      show('Lỗi khi xuất tệp sao lưu', 'error');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const res = await StorageService.importFullBackupJSON(content);
      if (res.success) {
        show(res.message, 'success');
        refreshStatus();
      } else {
        show(res.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    show('Đã sao chép vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const deployCommand = `# 1. Cài đặt các thư viện cần thiết
npm install

# 2. Build ứng dụng cho môi trường sản phẩm
npm run build

# 3. Khởi chạy máy chủ (nếu dùng server Node.js)
npm start`;

  const nginxSample = `server {
    listen 80;
    server_name kho.hungthinhcqt.vn; # Thay bằng domain của bạn

    root /var/www/hung-thinh-cqt/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}`;

  const capacitorSample = `# Bước 1: Cài đặt Capacitor cho iOS
npm install @capacitor/core @capacitor/cli @capacitor/ios

# Bước 2: Khởi tạo cấu hình ứng dụng
npx cap init "Hung Thinh CQT" "vn.hungthinhcqt.kho" --web-dir=dist

# Bước 3: Build mã nguồn React
npm run build

# Bước 4: Thêm nền tảng iOS
npx cap add ios

# Bước 5: Mở project Xcode trên máy Mac để build .ipa hoặc TestFlight
npx cap open ios`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Database size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Cơ sở dữ liệu Cloud & Triển khai Host</h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud Firestore Trực Tuyến
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Lưu trữ online tự động đa thiết bị, sao lưu dự phòng và hướng dẫn đưa mã nguồn lên hosting cá nhân.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleForceSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ tức thì lên Cloud'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cloud Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connection status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái kết nối</span>
            <Cloud size={20} className={syncStatus.connected ? 'text-emerald-500' : 'text-amber-500'} />
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${syncStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-base font-bold text-slate-800">
              {syncStatus.connected ? 'Đang kết nối Firestore' : 'Chế độ Cục bộ (Offline-first)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Dự án: <span className="font-mono font-medium text-slate-700">aerial-flag-5ghtt</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Lần đồng bộ gần nhất: {syncStatus.lastSynced ? new Date(syncStatus.lastSynced).toLocaleTimeString('vi-VN') : 'Đang đồng bộ tự động...'}
          </p>
        </div>

        {/* Collections stats */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dữ liệu trên Cloud</span>
            <Layers size={20} className="text-blue-500" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Sản phẩm</span>
              <span className="font-bold text-slate-800 text-sm">{dataCounts.products} mục</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Phiếu nhập kho</span>
              <span className="font-bold text-slate-800 text-sm">{dataCounts.imports} phiếu</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Phiếu xuất kho</span>
              <span className="font-bold text-slate-800 text-sm">{dataCounts.exports} phiếu</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Báo cáo tháng</span>
              <span className="font-bold text-slate-800 text-sm">{dataCounts.reports} báo cáo</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Mã PIN tài khoản</span>
              <span className="font-bold text-slate-800 text-sm">{dataCounts.accounts} tài khoản</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Nhật ký thao tác</span>
              <span className="font-bold text-slate-800 text-sm">{dataCounts.logs} log</span>
            </div>
          </div>
        </div>

        {/* Backup & Restore quick card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sao lưu & Phục hồi</span>
              <HardDrive size={20} className="text-purple-500" />
            </div>
            <p className="text-xs text-slate-600">
              Xuất toàn bộ dữ liệu ra tệp JSON dự phòng hoặc nhập tệp sao lưu khi chuyển đổi máy.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleExportBackup}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download size={14} />
              <span>Tải JSON</span>
            </button>
            <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition-colors cursor-pointer border border-purple-200">
              <Upload size={14} />
              <span>Nhập JSON</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* iOS App Conversion & Installation Guide */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Apple size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">
                  Chuyển đổi ứng dụng sang iOS (iPhone / iPad)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  Tương thích 100%
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Toàn bộ dữ liệu và tính năng đều đã sẵn sàng hoạt động như app iOS chính thức.
              </p>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setIosTab('pwa')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                iosTab === 'pwa'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone size={14} />
              <span>Cách 1: Cài ngay qua Safari (PWA)</span>
            </button>
            <button
              onClick={() => setIosTab('native')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                iosTab === 'native'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Apple size={14} />
              <span>Cách 2: Đóng gói Xcode (.ipa)</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {iosTab === 'pwa' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-xs text-blue-800 flex items-start gap-3">
                <Sparkles size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-blue-900">
                    Trải nghiệm Native không cần đưa lên App Store hay mất phí $99/năm của Apple:
                  </p>
                  <p className="mt-1 leading-relaxed">
                    Hệ thống đã cấu hình đầy đủ Apple Touch Icon, màn hình chờ splash screen, chế độ toàn màn hình Standalone (không hiện thanh địa chỉ Safari) và hỗ trợ vùng an toàn Dynamic Island / tai thỏ.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Mở bằng Safari</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Mở đường link ứng dụng trên trình duyệt Safari của iPhone / iPad.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    Bấm nút Chia sẻ <Share size={12} className="text-blue-600" />
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Bấm vào biểu tượng Share hình vuông có mũi tên trỏ lên ở cạnh dưới màn hình.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    Chọn "Thêm vào MH chính" <PlusSquare size={12} className="text-slate-700" />
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Chọn "Add to Home Screen" rồi nhấn "Thêm". Biểu tượng app sẽ xuất hiện ngay trên màn hình iPhone!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Nếu công ty cần đóng gói thành file cài đặt <strong>.ipa</strong> hoặc đưa lên <strong>Apple App Store / TestFlight</strong>, bạn có thể xuất toàn bộ mã nguồn này sang dự án Xcode Native bằng <strong>Capacitor</strong>:
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Terminal size={14} className="text-slate-400" />
                    Các lệnh thực thi trong Terminal máy Mac:
                  </span>
                  <button
                    onClick={() => copyToClipboard(capacitorSample, 'cap')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {copiedSection === 'cap' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedSection === 'cap' ? 'Đã sao chép' : 'Sao chép lệnh'}</span>
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
                  <pre>{capacitorSample}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Host Deployment Instructions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Server size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Hướng dẫn đưa mã nguồn lên Host / Máy chủ cá nhân
              </h2>
              <p className="text-xs text-slate-500">
                Bạn có thể đưa toàn bộ ứng dụng này lên bất kỳ hosting tĩnh (Vercel, Netlify) hoặc máy chủ riêng (VPS Ubuntu, Nginx, Node.js, cPanel).
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
              1
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-sm font-bold text-slate-800">Tải mã nguồn về máy tính</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Trên thanh công cụ phía trên bên phải của Google AI Studio, bấm vào menu ba chấm hoặc nút <strong>Export / Settings</strong> để:
              </p>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside bg-slate-50 p-3 rounded-xl border border-slate-100">
                <li><strong>Export as ZIP:</strong> Tải toàn bộ file mã nguồn dự án về máy tính của bạn dạng file nén.</li>
                <li><strong>Export to GitHub:</strong> Đẩy trực tiếp mã nguồn lên tài khoản GitHub riêng của bạn để tiện cập nhật tự động (CI/CD).</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
              2
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Cài đặt và Build ứng dụng (NPM)</h3>
                <button
                  onClick={() => copyToClipboard(deployCommand, 'cmd')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                >
                  {copiedSection === 'cmd' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  <span>{copiedSection === 'cmd' ? 'Đã sao chép' : 'Sao chép lệnh'}</span>
                </button>
              </div>
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto">
                <pre>{deployCommand}</pre>
              </div>
              <p className="text-xs text-slate-500">
                Sau khi chạy lệnh <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">npm run build</code>, thư mục <strong>dist/</strong> sẽ được tạo ra chứa toàn bộ mã nguồn sẵn sàng đưa lên hosting.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
              3
            </div>
            <div className="space-y-3 flex-1">
              <h3 className="text-sm font-bold text-slate-800">Các phương án triển khai Host phổ biến</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Option A: Vercel / Netlify */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-800">Cách 1: Miễn phí trên Vercel / Netlify</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    1. Đăng nhập Vercel.com hoặc Netlify.com (miễn phí).<br />
                    2. Kết nối repo GitHub của bạn hoặc kéo thả thư mục <strong>dist/</strong> lên Netlify Drop.<br />
                    3. Ứng dụng sẽ hoạt động 24/7 với tên miền miễn phí (hoặc gắn tên miền riêng của công ty).
                  </p>
                </div>

                {/* Option B: VPS / Nginx / Hostinger */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <Server size={16} className="text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-800">Cách 2: Máy chủ VPS riêng (Ubuntu / Nginx)</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    1. Copy nội dung thư mục <strong>dist/</strong> lên thư mục web trên VPS (ví dụ <code className="font-mono">/var/www/hung-thinh-cqt</code>).<br />
                    2. Cấu hình Nginx trỏ đường dẫn SPA tới file <strong>index.html</strong>.<br />
                    3. Cài SSL (Let's Encrypt Certbot) để bảo mật kết nối HTTPS.
                  </p>
                </div>
              </div>

              {/* Sample Nginx Config */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <FileCode size={14} className="text-slate-400" />
                    Cấu hình Nginx mẫu cho máy chủ riêng:
                  </span>
                  <button
                    onClick={() => copyToClipboard(nginxSample, 'nginx')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                  >
                    {copiedSection === 'nginx' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedSection === 'nginx' ? 'Đã sao chép' : 'Sao chép Nginx'}</span>
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-x-auto">
                  <pre>{nginxSample}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
