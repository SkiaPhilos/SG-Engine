import React, { useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { StorefrontView } from './components/storefront/StorefrontView';
import { CheckoutView } from './components/checkout/CheckoutView';
import { OrderConfirmationView } from './components/checkout/OrderConfirmationView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLogin } from './components/admin/AdminLogin';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const AppContent: React.FC = () => {
  const { currentView, setCurrentView, isAdmin, isAuthLoading } = useStore();

  // Listen for hash and pathname changes (e.g. /admin, #admin, #checkout)
  useEffect(() => {
    const handleUrlChange = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();

      const isAdminRoute =
        hash === '#admin' ||
        hash === '#/admin' ||
        hash.startsWith('#admin') ||
        path === '/admin' ||
        path.startsWith('/admin') ||
        search.includes('admin');

      if (isAdminRoute) {
        setCurrentView(isAdmin ? 'admin' : 'login');
      } else if (hash === '#checkout' || path === '/checkout') {
        setCurrentView('checkout');
      } else if (hash === '#order_confirmation' || hash === '#order-confirmation') {
        setCurrentView('order_confirmation');
      }
    };

    handleUrlChange();
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [isAdmin, setCurrentView]);

  // Keep admin URL hash synchronized when in admin view
  useEffect(() => {
    if (currentView === 'admin' || currentView === 'login') {
      if (window.location.hash !== '#admin') {
        window.location.hash = '#admin';
      }
    } else if (currentView === 'store' && window.location.hash === '#admin') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [currentView]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-neutral-300 border-t-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-neutral-500">Loading store...</p>
        </div>
      </div>
    );
  }

  switch (currentView) {
    case 'checkout':
      return <CheckoutView />;

    case 'order_confirmation':
      return <OrderConfirmationView />;

    case 'admin':
      return isAdmin ? <AdminDashboard /> : <AdminLogin />;

    case 'login':
      return <AdminLogin />;

    case 'store':
    default:
      return <StorefrontView />;
  }
};

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </ErrorBoundary>
  );
}
