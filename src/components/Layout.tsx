import React, { useState } from 'react';
import {
  Boxes,
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Warehouse,
  BarChart3,
  KeyRound,
  History,
  LogOut,
  Menu,
  X,
  Shield,
  ShieldCheck,
  Eye,
  Calendar,
  Layers,
  Database,
  Cloud,
  Apple,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StorageService } from '../services/storage';
import { IosInstallModal } from './IosInstallModal';

export interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  adminOnly?: boolean;
  badge?: string;
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'products', label: 'Sản phẩm', icon: Package },
  { key: 'imports', label: 'Nhập kho', icon: ArrowDownToLine },
  { key: 'exports', label: 'Xuất kho', icon: ArrowUpFromLine },
  { key: 'inventory', label: 'Tồn kho', icon: Warehouse },
  { key: 'reports', label: 'Báo cáo doanh thu', icon: BarChart3 },
  {
    key: 'database',
    label: 'Cơ sở dữ liệu & Host',
    icon: Database,
    badge: 'Cloud',
  },
  {
    key: 'audit-logs',
    label: 'Lịch sử thao tác',
    icon: History,
    adminOnly: true,
    badge: 'Admin',
  },
  {
    key: 'accounts',
    label: 'Mã PIN & Quyền',
    icon: KeyRound,
    adminOnly: true,
  },
];

interface LayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { profile, signOut, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  const navItems = ALL_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const handleNav = (key: string) => {
    onNavigate(key);
    setMobileMenuOpen(false);
  };

  const initial =
    profile?.name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'HT';

  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getRoleDisplay = () => {
    if (profile?.role === 'admin') {
      return {
        text: 'Quản trị viên (Admin)',
        icon: Shield,
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
      };
    }
    if (profile?.role === 'nhap') {
      return {
        text: 'Chỉ nhập liệu',
        icon: ArrowDownToLine,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    }
    return {
      text: 'Chỉ xem',
      icon: Eye,
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    };
  };

  const roleInfo = getRoleDisplay();
  const RoleIcon = roleInfo.icon;

  return (
    <div className="min-h-screen bg-slate-50/80 flex flex-col lg:flex-row pb-16 lg:pb-0">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop + Mobile Slide-over) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-300 shadow-xl lg:shadow-none ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Boxes size={22} />
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                CÔNG TY TNHH
              </span>
              <h1 className="text-sm font-black bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent leading-tight">
                HƯNG THỊNH CQT
              </h1>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Kho gỗ & Báo cáo</p>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNav(item.key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && !isActive && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {profile?.name || 'Tài khoản'}
                </p>
                <p className="text-[10px] font-mono text-slate-400">PIN: {profile?.pin || '••••'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${roleInfo.badgeClass}`}
              >
                <RoleIcon size={10} />
                {roleInfo.text}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setShowIosModal(true);
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Apple size={14} />
            <span>Cài đặt App trên iOS (iPhone)</span>
          </button>

          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
          >
            <LogOut size={14} />
            <span>Đổi mã PIN (Đăng xuất)</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-2.5 sm:py-3 pt-[max(0.65rem,env(safe-area-inset-top))] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Mở menu"
            >
              <Menu size={22} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
              <Calendar size={14} className="text-slate-400" />
              <span className="capitalize">{todayStr}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIosModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer shadow-2xs"
              title="Hướng dẫn cài đặt trên iPhone / iOS"
            >
              <Apple size={13} className="text-white" />
              <span className="font-bold">App iOS</span>
            </button>

            <button
              onClick={() => handleNav('database')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                currentPage === 'database'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-2xs'
              }`}
              title="Cơ sở dữ liệu Cloud & Triển khai Host"
            >
              <Cloud size={13} className="text-emerald-500" />
              <span className="hidden md:inline font-medium">Cloud DB:</span>
              <span className="text-[11px] text-emerald-600 font-bold">Trực tuyến</span>
            </button>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-white shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline text-slate-600 font-medium">Đang dùng PIN:</span>
              <span className="font-mono font-bold text-slate-800">{profile?.pin}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${roleInfo.badgeClass}`}>
                {profile?.role === 'admin' ? 'Admin' : profile?.role === 'nhap' ? 'Nhập' : 'Xem'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-8 pb-24 lg:pb-8">
          <div key={currentPage} className="animate-page-slide">
            {children}
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR: 4 Primary Actions + Menu */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-medium transition-colors ${
            currentPage === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard size={18} />
          <span>Tổng quan</span>
        </button>

        <button
          onClick={() => onNavigate('imports')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-medium transition-colors ${
            currentPage === 'imports' ? 'text-emerald-600 font-bold' : 'text-slate-400'
          }`}
        >
          <ArrowDownToLine size={18} />
          <span>Nhập kho</span>
        </button>

        <button
          onClick={() => onNavigate('exports')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-medium transition-colors ${
            currentPage === 'exports' ? 'text-violet-600 font-bold' : 'text-slate-400'
          }`}
        >
          <ArrowUpFromLine size={18} />
          <span>Xuất kho</span>
        </button>

        <button
          onClick={() => onNavigate('inventory')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-medium transition-colors ${
            currentPage === 'inventory' ? 'text-amber-600 font-bold' : 'text-slate-400'
          }`}
        >
          <Warehouse size={18} />
          <span>Tồn kho</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-medium text-slate-400 hover:text-slate-700`}
        >
          <Layers size={18} />
          <span>Thêm...</span>
        </button>
      </nav>

      {/* iOS Install & Packaging Modal */}
      <IosInstallModal isOpen={showIosModal} onClose={() => setShowIosModal(false)} />
    </div>
  );
}
