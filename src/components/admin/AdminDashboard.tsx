import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Sparkles,
  CreditCard,
  ShoppingBag,
  Palette,
  Layout,
  Settings,
  ExternalLink,
  LogOut,
  Wand2,
  CheckCircle2,
  Circle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { logoutAdmin } from '../../services/auth/authService';
import { ProductsManager } from './ProductsManager';
import { CategoriesManager } from './CategoriesManager';
import { OffersManager } from './OffersManager';
import { PaymentsManager } from './PaymentsManager';
import { OrdersManager } from './OrdersManager';
import { ThemeManager } from './ThemeManager';
import { HomepageManager } from './HomepageManager';
import { SettingsManager } from './SettingsManager';
import { SetupWizard } from './SetupWizard';
import { SafepayGatewayManager } from './SafepayGatewayManager';
import { Zap } from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'offers'
  | 'payments'
  | 'safepay'
  | 'orders'
  | 'theme'
  | 'homepage'
  | 'settings'
  | 'wizard';

export const AdminDashboard: React.FC = () => {
  const {
    adminUser,
    config,
    products,
    categories,
    offers,
    paymentMethods,
    orders,
    setCurrentView,
    themeColors,
    formatPrice,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const handleSignOut = async () => {
    await logoutAdmin();
    setCurrentView('store');
  };

  // Section 40: Setup Checklist Calculations
  const checklist = [
    {
      title: 'Define Authentic Store Identity',
      desc: 'Set custom store name and brand tagline',
      isComplete: config.storeName && config.storeName !== 'Configure Your Store',
      tab: 'settings' as AdminTab,
    },
    {
      title: 'Select Theme Preset',
      desc: 'Choose from 10 production-ready presets',
      isComplete: Boolean(config.themeId),
      tab: 'theme' as AdminTab,
    },
    {
      title: 'Establish First Category',
      desc: 'Create dynamic navigation collections',
      isComplete: categories.length > 0,
      tab: 'categories' as AdminTab,
    },
    {
      title: 'Add Initial Products',
      desc: 'Add products with prices and inventory',
      isComplete: products.length > 0,
      tab: 'products' as AdminTab,
    },
    {
      title: 'Configure Payment Destination',
      desc: 'Connect JazzCash, Easypaisa, Raast, or Bank IBAN',
      isComplete: paymentMethods.some(p => p.enabled),
      tab: 'payments' as AdminTab,
    },
    {
      title: 'Configure Delivery Rates',
      desc: 'Set standard shipping fee and free threshold',
      isComplete: Boolean(config.deliveryConfig?.flatFee !== undefined),
      tab: 'settings' as AdminTab,
    },
    {
      title: 'Create Promotional Offer',
      desc: 'Configure Buy X Get Y Free or Curated Bundle deal',
      isComplete: offers.length > 0,
      tab: 'offers' as AdminTab,
    },
  ];

  const completedCount = checklist.filter(c => c.isComplete).length;
  const progressPercent = Math.round((completedCount / checklist.length) * 100);

  // Revenue & Order metrics
  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingOrders = orders.filter(o => o.orderStatus === 'pending').length;
  const pendingPayments = orders.filter(
    o => o.paymentStatus === 'payment_submitted' || o.paymentStatus === 'pending_verification'
  ).length;

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview & Checklist', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders & Fulfillment', icon: <ShoppingBag className="w-4 h-4" />, badge: pendingOrders },
    { id: 'products', label: 'Products Catalog', icon: <Package className="w-4 h-4" />, badge: products.length },
    { id: 'categories', label: 'Categories', icon: <FolderTree className="w-4 h-4" /> },
    { id: 'offers', label: 'Promotions & Bundles', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'payments', label: 'Payment Destinations', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'safepay', label: 'Safepay Gateway', icon: <Zap className="w-4 h-4 text-emerald-500" /> },
    { id: 'theme', label: 'Theme & Visuals', icon: <Palette className="w-4 h-4" /> },
    { id: 'homepage', label: 'Homepage Layout', icon: <Layout className="w-4 h-4" /> },
    { id: 'settings', label: 'Store Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-colors" style={{ backgroundColor: themeColors.background }}>
      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        className="w-full md:w-64 border-b md:border-b-0 md:border-r flex flex-col justify-between p-4 flex-shrink-0"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <div className="space-y-6">
          {/* Admin Header */}
          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: themeColors.border }}>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: themeColors.primary }}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm truncate max-w-[130px]" style={{ color: themeColors.text }}>
                  {config.storeName || 'Store Engine'}
                </h1>
                <p className="text-[10px] text-neutral-400">Admin Control Center</p>
              </div>
            </div>
          </div>

          {/* Quick Setup Wizard Button */}
          <button
            id="open-wizard-btn"
            onClick={() => setActiveTab('wizard')}
            className={`w-full p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
              activeTab === 'wizard'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'hover:border-neutral-400 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
            }`}
            style={{ borderColor: activeTab === 'wizard' ? undefined : themeColors.border }}
          >
            <span className="flex items-center gap-2">
              <Wand2 className="w-3.5 h-3.5" />
              <span>10-Step Wizard</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === item.id
                    ? 'shadow-xs'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                style={{
                  backgroundColor: activeTab === item.id ? `${themeColors.primary}15` : 'transparent',
                  color: activeTab === item.id ? themeColors.primary : themeColors.text,
                }}
              >
                <span className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: `${themeColors.primary}20`,
                      color: themeColors.primary,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t space-y-2 mt-4" style={{ borderColor: themeColors.border }}>
          <button
            onClick={() => setCurrentView('store')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Live Storefront</span>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          {adminUser && (
            <p className="text-[10px] truncate text-neutral-400 px-3 pt-1">
              {adminUser.email}
            </p>
          )}
        </div>
      </aside>

      {/* Main Content Stage */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {activeTab === 'wizard' && (
          <SetupWizard onComplete={() => setActiveTab('overview')} />
        )}

        {activeTab === 'overview' && (
          <div className="space-y-8 max-w-5xl">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div
                className="p-5 rounded-2xl border shadow-2xs"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
              >
                <p className="text-xs font-medium" style={{ color: themeColors.muted }}>Verified Revenue</p>
                <p className="text-2xl font-black mt-1" style={{ color: themeColors.primary }}>
                  {formatPrice(totalRevenue)}
                </p>
                <p className="text-[10px] text-neutral-400 mt-1">From approved orders</p>
              </div>

              <div
                className="p-5 rounded-2xl border shadow-2xs"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
              >
                <p className="text-xs font-medium" style={{ color: themeColors.muted }}>Total Orders</p>
                <p className="text-2xl font-black mt-1" style={{ color: themeColors.text }}>
                  {orders.length}
                </p>
                <p className="text-[10px] text-amber-600 font-semibold mt-1">
                  {pendingOrders} awaiting fulfillment
                </p>
              </div>

              <div
                className="p-5 rounded-2xl border shadow-2xs"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
              >
                <p className="text-xs font-medium" style={{ color: themeColors.muted }}>Payment Verifications</p>
                <p className="text-2xl font-black mt-1" style={{ color: themeColors.text }}>
                  {pendingPayments}
                </p>
                <p className="text-[10px] text-purple-600 font-semibold mt-1">TID / Receipts to audit</p>
              </div>

              <div
                className="p-5 rounded-2xl border shadow-2xs"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
              >
                <p className="text-xs font-medium" style={{ color: themeColors.muted }}>Active Catalog</p>
                <p className="text-2xl font-black mt-1" style={{ color: themeColors.text }}>
                  {products.length}
                </p>
                <p className="text-[10px] text-neutral-400 mt-1">Across {categories.length} categories</p>
              </div>
            </div>

            {/* Section 40: Launch Readiness Checklist */}
            <div
              className="p-6 rounded-2xl border shadow-xs space-y-4"
              style={{ borderColor: 'rgba(255, 255, 255, 0.15)', backgroundColor: '#403a3a' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Store Launch Readiness ({completedCount}/{checklist.length})
                  </h3>
                  <p className="text-xs text-neutral-300">
                    Complete these items to make your storefront 100% production-ready.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {progressPercent}% Complete
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-neutral-700/80 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Checklist Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {checklist.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveTab(item.tab)}
                    className="p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer hover:border-neutral-400 transition-all bg-[#2e2929] border-[#524b4b]"
                  >
                    <div className="flex items-center gap-3">
                      {item.isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                      )}
                      <div>
                        <h4 className="font-bold text-xs text-white">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-neutral-300">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab('products')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: themeColors.primary }}
              >
                + Add New Product
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className="px-4 py-2 rounded-xl text-xs font-bold border hover:bg-neutral-100 dark:hover:bg-neutral-800"
                style={{ borderColor: themeColors.border, color: themeColors.text }}
              >
                Configure Payment Rail
              </button>
              <button
                onClick={() => setActiveTab('theme')}
                className="px-4 py-2 rounded-xl text-xs font-bold border hover:bg-neutral-100 dark:hover:bg-neutral-800"
                style={{ borderColor: themeColors.border, color: themeColors.text }}
              >
                Switch Preset Theme
              </button>
            </div>
          </div>
        )}

        {activeTab === 'products' && <ProductsManager />}
        {activeTab === 'categories' && <CategoriesManager />}
        {activeTab === 'offers' && <OffersManager />}
        {activeTab === 'payments' && <PaymentsManager />}
        {activeTab === 'safepay' && <SafepayGatewayManager />}
        {activeTab === 'orders' && <OrdersManager />}
        {activeTab === 'theme' && <ThemeManager />}
        {activeTab === 'homepage' && <HomepageManager />}
        {activeTab === 'settings' && <SettingsManager />}
      </main>
    </div>
  );
};
