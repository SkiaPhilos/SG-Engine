import React, { useState } from 'react';
import { ShoppingBag, Search, X, ArrowRight, Menu } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const StoreHeader: React.FC = () => {
  const {
    config,
    categories,
    cart,
    setIsCartOpen,
    searchQuery,
    setSearchQuery,
    activeCategoryFilter,
    setActiveCategoryFilter,
    setCurrentView,
    themeColors,
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const activeCategories = categories.filter(c => c.isActive);

  // Check announcement section
  const announcementSection = config.homepageSections?.find(
    s => s.type === 'announcement' && s.enabled
  );

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md transition-colors"
      style={{
        backgroundColor: `${themeColors.surface}f2`,
        borderBottom: `1px solid ${themeColors.border}`,
      }}
    >
      {/* Top Announcement Bar */}
      {announcementSection && announcementSection.config?.text && (
        <div
          id="announcement-bar"
          className="px-4 py-2 text-center text-xs sm:text-sm font-medium transition-all"
          style={{
            backgroundColor: themeColors.primary,
            color: '#ffffff',
          }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <span>{announcementSection.config?.text}</span>
            {announcementSection.config?.linkText && (
              <a
                href={announcementSection.config?.linkUrl || '#'}
                className="underline inline-flex items-center gap-1 font-semibold opacity-90 hover:opacity-100 transition-opacity"
              >
                {announcementSection.config?.linkText}
                <ArrowRight className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Mobile menu trigger */}
          <button
            id="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: themeColors.text }}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo & Store Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setCurrentView('store'); setActiveCategoryFilter(null); }}>
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.storeName}
                className="h-9 sm:h-11 w-auto object-contain"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm"
                style={{
                  backgroundColor: themeColors.primary,
                  color: '#ffffff',
                }}
              >
                {config.storeName ? config.storeName.charAt(0).toUpperCase() : 'S'}
              </div>
            )}
            <span
              id="store-brand-title"
              className="font-bold text-lg sm:text-xl tracking-tight"
              style={{ color: themeColors.text }}
            >
              {config.storeName || 'Store Engine'}
            </span>
          </div>

          {/* Desktop Categories Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              id="nav-cat-all"
              onClick={() => {
                setActiveCategoryFilter(null);
                setCurrentView('store');
              }}
              className="px-3 py-1.5 text-sm font-medium rounded-full transition-all"
              style={{
                backgroundColor: activeCategoryFilter === null ? themeColors.primary : 'transparent',
                color: activeCategoryFilter === null ? '#ffffff' : themeColors.muted,
              }}
            >
              All Products
            </button>
            {activeCategories.map(category => {
              const isSelected = activeCategoryFilter === category.id;
              return (
                <button
                  key={category.id}
                  id={`nav-cat-${category.id}`}
                  onClick={() => {
                    setActiveCategoryFilter(category.id);
                    setCurrentView('store');
                  }}
                  className="px-3 py-1.5 text-sm font-medium rounded-full transition-all"
                  style={{
                    backgroundColor: isSelected ? themeColors.primary : 'transparent',
                    color: isSelected ? '#ffffff' : themeColors.muted,
                  }}
                >
                  {category.name}
                </button>
              );
            })}
          </nav>

          {/* Actions: Search, Admin Dashboard Link, Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Trigger / Input */}
            {config.searchEnabled !== false && (
              <div className="relative">
                {showSearchInput ? (
                  <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-full px-3 py-1.5 border border-neutral-200 dark:border-neutral-700">
                    <Search className="w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs sm:text-sm w-28 sm:w-44"
                      style={{ color: themeColors.text }}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setShowSearchInput(false);
                        setSearchQuery('');
                      }}
                      className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    id="search-toggle-btn"
                    onClick={() => setShowSearchInput(true)}
                    className="p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    style={{ color: themeColors.text }}
                    title="Search catalog"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Cart Drawer Trigger */}
            <button
              id="cart-drawer-trigger-btn"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-full transition-transform active:scale-95"
              style={{
                backgroundColor: themeColors.primary,
                color: '#ffffff',
              }}
              aria-label="View shopping cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCartCount > 0 && (
                <span
                  id="cart-badge-count"
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center border-2"
                  style={{
                    backgroundColor: themeColors.accent,
                    color: '#ffffff',
                    borderColor: themeColors.surface,
                  }}
                >
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-panel"
            className="md:hidden py-4 border-t transition-all"
            style={{ borderColor: themeColors.border }}
          >
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setActiveCategoryFilter(null);
                  setCurrentView('store');
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: activeCategoryFilter === null ? themeColors.primary : 'transparent',
                  color: activeCategoryFilter === null ? '#ffffff' : themeColors.text,
                }}
              >
                All Products
              </button>
              {activeCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategoryFilter(cat.id);
                    setCurrentView('store');
                    setMobileMenuOpen(false);
                  }}
                  className="text-left px-3 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: activeCategoryFilter === cat.id ? themeColors.primary : 'transparent',
                    color: activeCategoryFilter === cat.id ? '#ffffff' : themeColors.text,
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
