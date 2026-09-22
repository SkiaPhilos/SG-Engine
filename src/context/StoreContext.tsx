import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import {
  StoreConfig,
  Category,
  Product,
  Offer,
  PaymentMethod,
  Order,
  CartItem,
  ThemePreset,
  ThemeColors,
} from '../types/store';
import {
  DEFAULT_STORE_ID,
  DEFAULT_STORE_CONFIG,
  subscribeStoreData,
  getStoreConfig,
} from '../services/store/storeService';
import { getThemePreset, deriveThemeColors } from '../engine/theme/themes';
import { calculateOrderTotals, PricingCalculationResult } from '../engine/pricing/pricingEngine';
import { checkIsAdmin, subscribeAuthState } from '../services/auth/authService';

export type AppView =
  | 'store'
  | 'category'
  | 'product_detail'
  | 'cart'
  | 'checkout'
  | 'order_confirmation'
  | 'admin'
  | 'login'
  | 'setup_wizard';

export interface StoreContextValue {
  storeId: string;
  config: StoreConfig;
  categories: Category[];
  products: Product[];
  offers: Offer[];
  paymentMethods: PaymentMethod[];
  orders: Order[];
  isLoading: boolean;
  isAuthLoading: boolean;
  cart: CartItem[];
  addToCart: (productId: string, quantity?: number, offerId?: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  pricing: PricingCalculationResult;
  activeTheme: ThemePreset;
  themeColors: ThemeColors;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  activeCategoryFilter: string | null;
  setActiveCategoryFilter: (catId: string | null) => void;
  selectedCategoryId: string | null;
  setSelectedCategoryId: (catId: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  activeOrderId: string | null;
  setActiveOrderId: (id: string | null) => void;
  adminUser: User | null;
  isAdmin: boolean;
  checkAdminStatus: () => Promise<boolean>;
  formatPrice: (amount: number) => string;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storeId] = useState<string>(DEFAULT_STORE_ID);
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_STORE_CONFIG);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // User & Admin state
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Navigation & View state
  const [currentView, setCurrentView] = useState<AppView>('store');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(`cart_${storeId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`cart_${storeId}`, JSON.stringify(cart));
    } catch (e) {
      console.warn('LocalStorage cart error', e);
    }
  }, [cart, storeId]);

  // Auth observer
  useEffect(() => {
    const unsub = subscribeAuthState(async user => {
      setAdminUser(user);
      if (user) {
        const adminStatus = await checkIsAdmin(user);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
      setIsAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const checkAdminStatus = async () => {
    const { data } = await supabase.auth.getUser();
    const status = await checkIsAdmin(data?.user || null);
    setIsAdmin(status);
    return status;
  };

  // Real-time Store Data Subscription
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeStoreData(storeId, {
      onStoreConfig: conf => {
        setConfig(conf);
        setIsLoading(false);
      },
      onCategories: cats => setCategories(cats),
      onProducts: prods => setProducts(prods),
      onOffers: offs => setOffers(offs),
      onPaymentMethods: pms => setPaymentMethods(pms),
      onOrders: ords => setOrders(ords),
    });

    return () => unsubscribe();
  }, [storeId]);

  // Active theme calculation
  const activeTheme = useMemo(() => {
    return getThemePreset(config.themeId);
  }, [config.themeId]);

  const themeColors = useMemo(() => {
    return deriveThemeColors(activeTheme, config.themeCustomColors);
  }, [activeTheme, config.themeCustomColors]);

  // Apply CSS variables to root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-theme-primary', themeColors.primary);
    root.style.setProperty('--color-theme-secondary', themeColors.secondary);
    root.style.setProperty('--color-theme-accent', themeColors.accent);
    root.style.setProperty('--color-theme-bg', themeColors.background);
    root.style.setProperty('--color-theme-surface', themeColors.surface);
    root.style.setProperty('--color-theme-text', themeColors.text);
    root.style.setProperty('--color-theme-muted', themeColors.muted);
    root.style.setProperty('--color-theme-border', themeColors.border);
    root.style.setProperty('--theme-radius', activeTheme.borderRadius);
    root.style.setProperty('--theme-font', activeTheme.fontFamily);
  }, [themeColors, activeTheme]);

  // Central pricing calculation
  const pricing = useMemo(() => {
    return calculateOrderTotals(cart, products, offers, config.deliveryConfig, {
      taxConfig: config.taxConfig,
    });
  }, [cart, products, offers, config.deliveryConfig, config.taxConfig]);

  // Cart operations
  const addToCart = (productId: string, quantity = 1, offerId?: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId && item.selectedOfferId === offerId);
      if (existing) {
        return prev.map(item =>
          item.productId === productId && item.selectedOfferId === offerId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { productId, quantity, selectedOfferId: offerId }];
    });
    setIsCartOpen(true);
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item => (item.productId === productId ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const formatPrice = (amount: number) => {
    const sym = config.currencySymbol || 'Rs.';
    return `${sym} ${amount.toLocaleString()}`;
  };

  return (
    <StoreContext.Provider
      value={{
        storeId,
        config,
        categories,
        products,
        offers,
        paymentMethods,
        orders,
        isLoading,
        isAuthLoading,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        pricing,
        activeTheme,
        themeColors,
        currentView,
        setCurrentView,
        activeCategoryFilter,
        setActiveCategoryFilter,
        selectedCategoryId: activeCategoryFilter,
        setSelectedCategoryId: setActiveCategoryFilter,
        searchQuery,
        setSearchQuery,
        searchTerm: searchQuery,
        setSearchTerm: setSearchQuery,
        selectedProduct,
        setSelectedProduct,
        activeOrderId,
        setActiveOrderId,
        adminUser,
        isAdmin,
        checkAdminStatus,
        formatPrice,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextValue => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
