import React, { useState } from 'react';
import {
  Smartphone,
  Apple,
  Share,
  PlusSquare,
  Check,
  Copy,
  X,
  Sparkles,
  Download,
  Terminal,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Wifi,
  Zap,
} from 'lucide-react';

interface IosInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IosInstallModal({ isOpen, onClose }: IosInstallModalProps) {
  const [activeTab, setActiveTab] = useState<'pwa' | 'native'>('pwa');
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const capacitorCmd = `# Bước 1: Cài đặt Capacitor cho iOS
npm install @capacitor/core @capacitor/cli @capacitor/ios

# Bước 2: Khởi tạo cấu hình ứng dụng
npx cap init "Hung Thinh CQT" "vn.hungthinhcqt.kho" --web-dir=dist

# Bước 3: Build mã nguồn React
npm run build

# Bước 4: Tạo thư mục dự án Xcode native
npx cap add ios

# Bước 5: Mở project trong Xcode trên máy Mac
npx cap open ios`;

  const copyCapacitorCommands = () => {
    navigator.clipboard.writeText(capacitorCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/15">
              <Apple size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Chuyển đổi & Sử dụng trên iOS (iPhone / iPad)
              </h2>
              <p className="text-xs text-slate-300">
                2 giải pháp tối ưu: Cài ngay không cần duyệt hoặc đóng gói App Store
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all ${
              activeTab === 'pwa'
                ? 'bg-white text-blue-600 border-slate-200 -mb-px shadow-xs'
                : 'text-slate-500 hover:text-slate-800 border-transparent'
            }`}
          >
            <Smartphone size={15} />
            <span>Cách 1: Cài ngay trên iPhone (PWA Web App)</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
              Khuyên dùng
            </span>
          </button>

          <button
            onClick={() => setActiveTab('native')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all ${
              activeTab === 'native'
                ? 'bg-white text-blue-600 border-slate-200 -mb-px shadow-xs'
                : 'text-slate-500 hover:text-slate-800 border-transparent'
            }`}
          >
            <Apple size={15} />
            <span>Cách 2: Đóng gói Xcode / App Store (.ipa)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          {activeTab === 'pwa' ? (
            <div className="space-y-5">
              {/* Feature highlight */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-start gap-3">
                <Sparkles className="text-blue-600 shrink-0 mt-0.5" size={20} />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-blue-900">
                    Ứng dụng đã được tích hợp đầy đủ chuẩn Apple Web App & PWA
                  </p>
                  <p className="text-blue-700 leading-relaxed">
                    Bạn không cần tài khoản Apple Developer ($99/năm) hay chờ Apple xét duyệt.
                    Khi cài vào iPhone, app chạy <strong>toàn màn hình</strong>, có biểu tượng riêng trên màn hình chính,
                    không hiện thanh URL Safari, đồng bộ Firebase thời gian thực.
                  </p>
                </div>
              </div>

              {/* 3 Steps */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Các bước cài đặt chỉ trong 30 giây trên iPhone:
                </h3>

                {/* Step 1 */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-800">
                      Mở liên kết ứng dụng bằng trình duyệt Safari
                    </p>
                    <p className="text-slate-500 leading-relaxed">
                      Trên iPhone hoặc iPad, hãy đảm bảo bạn đang mở liên kết bằng trình duyệt <strong>Safari</strong> gốc của Apple (không dùng chế độ xem web bên trong Zalo hay Messenger).
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      Bấm vào nút Chia sẻ
                      <span className="inline-flex items-center justify-center p-1 rounded bg-blue-100 text-blue-700">
                        <Share size={12} />
                      </span>
                    </p>
                    <p className="text-slate-500 leading-relaxed">
                      Ở thanh menu phía dưới cùng của Safari, bấm vào biểu tượng <strong>Chia sẻ (hình vuông có mũi tên chỉ lên)</strong>.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      Chọn "Thêm vào MH chính" (Add to Home Screen)
                      <span className="inline-flex items-center justify-center p-1 rounded bg-slate-200 text-slate-700">
                        <PlusSquare size={12} />
                      </span>
                    </p>
                    <p className="text-slate-500 leading-relaxed">
                      Cuộn xuống danh sách tùy chọn và chọn <strong>"Thêm vào MH chính"</strong>, sau đó nhấn nút <strong>"Thêm" (Add)</strong> ở góc trên bên phải màn hình.
                    </p>
                  </div>
                </div>
              </div>

              {/* App icon preview */}
              <div className="p-4 rounded-2xl bg-slate-100 flex items-center justify-between border border-slate-200">
                <div className="flex items-center gap-3">
                  <img
                    src="/icons/apple-touch-icon.png"
                    alt="App Icon"
                    className="w-12 h-12 rounded-2xl shadow-md border border-white/60 object-cover"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Kho Hưng Thịnh CQT</h4>
                    <p className="text-[11px] text-slate-500">Biểu tượng ứng dụng trên màn hình iPhone</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <ShieldCheck size={16} />
                  <span>Sẵn sàng cài</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-2">
                <p className="font-bold text-amber-900">
                  Yêu cầu để đóng gói thành ứng dụng iOS Native (.ipa / App Store):
                </p>
                <ul className="text-amber-800 list-disc list-inside space-y-1">
                  <li>Một máy tính <strong>macOS</strong> cài đặt <strong>Xcode</strong> (tải miễn phí từ Mac App Store).</li>
                  <li>Tài khoản Apple Developer nếu muốn đăng lên App Store hoặc TestFlight công khai.</li>
                  <li>Nếu chỉ phân phối nội bộ công ty: có thể dùng dịch vụ đóng gói Ad-hoc hoặc AltStore/TrollStore.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Terminal size={15} className="text-slate-500" />
                    Lệnh chuyển đổi mã nguồn bằng Capacitor (Ionic):
                  </h3>
                  <button
                    onClick={copyCapacitorCommands}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 transition-colors"
                  >
                    {copiedCmd ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copiedCmd ? 'Đã sao chép' : 'Sao chép lệnh'}</span>
                  </button>
                </div>

                <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                  <pre>{capacitorCmd}</pre>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-800">Ưu điểm Native:</p>
                  <p className="text-slate-500 leading-relaxed">
                    Có thể tải lên kho Apple App Store, gửi mã mời qua TestFlight cho nhân viên, gọi được camera quét mã vạch và thông báo đẩy (Push Notification) qua APNs.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-800">Khuyên dùng cho doanh nghiệp:</p>
                  <p className="text-slate-500 leading-relaxed">
                    Nên dùng <strong>Cách 1 (PWA)</strong> trước vì nhân viên dùng được ngay lập tức, không tốn chi phí chứng chỉ Apple $99/năm và cập nhật code là máy tự đổi mới.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 sm:px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Hỗ trợ iOS 14.0+ (iPhone, iPad, iPod Touch)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
