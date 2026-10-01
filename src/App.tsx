import { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './components/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ImportsPage } from './pages/ImportsPage';
import { ExportsPage } from './pages/ExportsPage';
import { InventoryPage } from './pages/InventoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { AccountsPage } from './pages/AccountsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { CloudDatabasePage } from './pages/CloudDatabasePage';

function MainApp() {
  const { profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').trim();
      const validPages = ['dashboard', 'products', 'imports', 'exports', 'inventory', 'reports', 'accounts', 'audit-logs', 'database'];
      if (hash && validPages.includes(hash)) return hash;
      const saved = localStorage.getItem('ht_current_page');
      if (saved && validPages.includes(saved)) return saved;
    }
    return 'dashboard';
  });

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    try {
      localStorage.setItem('ht_current_page', page);
      if (typeof window !== 'undefined') {
        window.location.hash = page;
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'products':
        return <ProductsPage />;
      case 'imports':
        return <ImportsPage />;
      case 'exports':
        return <ExportsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'reports':
        return <ReportsPage />;
      case 'accounts':
        return <AccountsPage />;
      case 'audit-logs':
        return <AuditLogsPage />;
      case 'database':
        return <CloudDatabasePage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
