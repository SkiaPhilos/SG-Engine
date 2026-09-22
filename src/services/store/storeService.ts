import { supabase, isSupabaseConfigured } from '../supabase/client';
import {
  toStoreConfig,
  fromStoreConfig,
  toCategory,
  fromCategory,
  toProduct,
  fromProduct,
  toOffer,
  fromOffer,
  toPaymentMethod,
  fromPaymentMethod,
  toOrder,
  fromOrder,
} from '../supabase/types';
import {
  StoreConfig,
  Category,
  Product,
  Offer,
  PaymentMethod,
  Order,
  HomepageSection,
  InventoryHoldResult,
  OrderEvent,
  OrderEventType,
} from '../../types/store';

export const DEFAULT_STORE_ID = 'default';

export const INITIAL_DEFAULT_SECTIONS: HomepageSection[] = [
  {
    id: 'sec-announcement',
    type: 'announcement',
    title: 'Announcement Bar',
    subtitle: 'Free nationwide delivery on qualifying orders!',
    enabled: true,
    config: {
      text: 'Special launch promotion active. Discover curated bundles & new arrivals.',
      linkText: 'Shop New Arrivals',
      linkUrl: '#products',
    },
  },
  {
    id: 'sec-hero',
    type: 'hero',
    title: 'Modern Retail, Reimagined',
    subtitle: 'Curated essentials crafted with precision, durability, and contemporary elegance.',
    enabled: true,
    config: {
      tagline: 'New Season Showcase',
      ctaPrimaryText: 'Explore Catalog',
      ctaPrimaryLink: '#products',
      ctaSecondaryText: 'View Offers',
      ctaSecondaryLink: '#offers',
      badgeText: 'Curated Collection',
      imageUrl: '',
    },
  },
  {
    id: 'sec-category-showcase',
    type: 'category_showcase',
    title: 'Shop by Category',
    subtitle: 'Browse collections thoughtfully organized for every lifestyle.',
    enabled: true,
    config: {
      layout: 'chips',
    },
  },
  {
    id: 'sec-offer-banner',
    type: 'offer_banner',
    title: 'Promotions & Bundles',
    subtitle: 'Exceptional packages engineered for higher value.',
    enabled: true,
    config: {
      style: 'floating',
    },
  },
  {
    id: 'sec-product-grid',
    type: 'product_grid',
    title: 'All Products',
    subtitle: 'Explore our complete catalog with direct ordering.',
    enabled: true,
    config: {
      showFilters: true,
      itemsPerPage: 12,
    },
  },
  {
    id: 'sec-faq',
    type: 'faq',
    title: 'Frequently Asked Questions',
    subtitle: 'Straightforward answers about our shipping, order verification, and quality.',
    enabled: true,
    config: {
      items: [
        {
          q: 'How does payment verification work?',
          a: 'When you checkout, you select a configured payment method (JazzCash, Easypaisa, Raast, or Bank Transfer), submit the payment, and enter your reference ID or receipt. Our team verifies it promptly.',
        },
        {
          q: 'How long does delivery take?',
          a: 'Standard delivery typically takes 2-4 business days depending on your destination city.',
        },
        {
          q: 'Can I track my order status?',
          a: 'Yes, after placing an order you receive an order reference number to view real-time status updates directly.',
        },
      ],
    },
  },
  {
    id: 'sec-footer',
    type: 'footer',
    title: 'Store Footer',
    enabled: true,
    config: {
      copyrightText: 'All rights reserved.',
    },
  },
];

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  id: DEFAULT_STORE_ID,
  storeName: 'Configure Your Store',
  storeDescription: 'A versatile, modern e-commerce storefront powered by the Store Engine.',
  logoUrl: '',
  faviconUrl: '',
  currency: 'PKR',
  currencySymbol: 'Rs.',
  contact: {
    email: 'support@storeengine.com',
    phone: '+92 300 1234567',
    whatsapp: '+92 300 1234567',
    address: 'Commerce Avenue, Innovation Hub',
  },
  socialLinks: {
    instagram: '',
    facebook: '',
    twitter: '',
    tiktok: '',
  },
  themeId: 'clean-commerce',
  productDisplayPreset: 'standard-grid',
  homepageSections: INITIAL_DEFAULT_SECTIONS,
  deliveryConfig: {
    enabled: true,
    flatFee: 250,
    cityFee: 150,
    countryFee: 250,
    ownerCity: 'Lahore',
    shopAddress: 'My Shop Address',
    pickupEnabled: true,
    freeDeliveryThreshold: 3000,
    estimateText: '2-4 business days',
  },
  taxConfig: {
    enabled: false,
    category: 'GST / Sales Tax',
    percentage: 0,
  },
  checkoutConfig: {
    requirePhone: true,
    requireEmail: true,
    requireAddress: true,
    orderNotesEnabled: true,
  },
  searchEnabled: true,
  isConfigured: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ============================================================================
// Local Fallback Storage Cache
// (Used seamlessly when Supabase credentials are not yet entered)
// ============================================================================
const LOCAL_STORAGE_PREFIX = 'store_engine_';

function getLocalItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch (err) {
    console.warn('LocalStorage save warning:', err);
  }
}

// ============================================================================
// 1. Store Configuration
// ============================================================================

export async function getStoreConfig(storeId = DEFAULT_STORE_ID): Promise<StoreConfig> {
  if (!isSupabaseConfigured()) {
    return getLocalItem<StoreConfig>(`config_${storeId}`, { ...DEFAULT_STORE_CONFIG, id: storeId });
  }

  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase getStoreConfig error:', error.message);
      return getLocalItem<StoreConfig>(`config_${storeId}`, { ...DEFAULT_STORE_CONFIG, id: storeId });
    }

    if (data) {
      const config = toStoreConfig(data);
      setLocalItem(`config_${storeId}`, config);
      return config;
    }

    // Default template if store not yet inserted
    return { ...DEFAULT_STORE_CONFIG, id: storeId };
  } catch (err) {
    console.error('getStoreConfig exception:', err);
    return getLocalItem<StoreConfig>(`config_${storeId}`, { ...DEFAULT_STORE_CONFIG, id: storeId });
  }
}

// ============================================================================
// Real-time Event Bus & State Synchronization
// ============================================================================

export type StoreDataChangeType = 'config' | 'categories' | 'products' | 'offers' | 'payment_methods' | 'orders';

export interface StoreSubscriptionListener {
  storeId: string;
  callbacks: {
    onStoreConfig?: (config: StoreConfig) => void;
    onCategories?: (categories: Category[]) => void;
    onProducts?: (products: Product[]) => void;
    onOffers?: (offers: Offer[]) => void;
    onPaymentMethods?: (methods: PaymentMethod[]) => void;
    onOrders?: (orders: Order[]) => void;
  };
}

export const activeStoreSubscriptions = new Set<StoreSubscriptionListener>();

export function notifyStoreChange(storeId: string, type: StoreDataChangeType, data?: any) {
  for (const sub of activeStoreSubscriptions) {
    if (sub.storeId === storeId) {
      try {
        if (type === 'products' && sub.callbacks.onProducts) {
          if (data) {
            sub.callbacks.onProducts(data);
          } else {
            getProducts(storeId).then(p => sub.callbacks.onProducts?.(p)).catch(() => {});
          }
        } else if (type === 'categories' && sub.callbacks.onCategories) {
          if (data) {
            sub.callbacks.onCategories(data);
          } else {
            getCategories(storeId).then(c => sub.callbacks.onCategories?.(c)).catch(() => {});
          }
        } else if (type === 'offers' && sub.callbacks.onOffers) {
          if (data) {
            sub.callbacks.onOffers(data);
          } else {
            getOffers(storeId).then(o => sub.callbacks.onOffers?.(o)).catch(() => {});
          }
        } else if (type === 'payment_methods' && sub.callbacks.onPaymentMethods) {
          if (data) {
            sub.callbacks.onPaymentMethods(data);
          } else {
            getPaymentMethods(storeId).then(pm => sub.callbacks.onPaymentMethods?.(pm)).catch(() => {});
          }
        } else if (type === 'config' && sub.callbacks.onStoreConfig) {
          if (data) {
            sub.callbacks.onStoreConfig(data);
          } else {
            getStoreConfig(storeId).then(cfg => sub.callbacks.onStoreConfig?.(cfg)).catch(() => {});
          }
        } else if (type === 'orders' && sub.callbacks.onOrders) {
          if (data) {
            sub.callbacks.onOrders(data);
          } else {
            getOrders(storeId).then(ord => sub.callbacks.onOrders?.(ord)).catch(() => {});
          }
        }
      } catch (err) {
        console.warn(`Error in store notification callback for ${type}:`, err);
      }
    }
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('store_data_changed', { detail: { storeId, type, data } }));
    } catch {}
  }
}

export async function saveStoreConfig(storeId = DEFAULT_STORE_ID, config: Partial<StoreConfig>): Promise<void> {
  const merged: StoreConfig = {
    ...DEFAULT_STORE_CONFIG,
    ...(getLocalItem<StoreConfig>(`config_${storeId}`, DEFAULT_STORE_CONFIG)),
    ...config,
    id: storeId,
    updatedAt: new Date().toISOString(),
  };
  setLocalItem(`config_${storeId}`, merged);
  notifyStoreChange(storeId, 'config', merged);

  if (!isSupabaseConfigured()) return;

  try {
    const row = fromStoreConfig(merged);
    const { error } = await supabase
      .from('stores')
      .upsert({ ...row, id: storeId }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase saveStoreConfig error:', error.message);
      throw error;
    }
  } catch (err) {
    console.error('saveStoreConfig exception:', err);
    throw err;
  }
}

// ============================================================================
// 2. Categories
// ============================================================================

export async function getCategories(storeId = DEFAULT_STORE_ID): Promise<Category[]> {
  if (!isSupabaseConfigured()) {
    return getLocalItem<Category[]>(`categories_${storeId}`, []);
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('Supabase getCategories error:', error.message);
      return getLocalItem<Category[]>(`categories_${storeId}`, []);
    }

    const categories = (data || []).map(toCategory);
    setLocalItem(`categories_${storeId}`, categories);
    return categories;
  } catch (err) {
    console.error('getCategories exception:', err);
    return getLocalItem<Category[]>(`categories_${storeId}`, []);
  }
}

export async function saveCategory(
  storeId = DEFAULT_STORE_ID,
  category: Partial<Category> & { name: string }
): Promise<string> {
  const catId = category.id || `cat_${Date.now()}`;
  const slug = category.slug || category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const newCategory: Category = {
    id: catId,
    storeId,
    name: category.name,
    slug,
    description: category.description || '',
    imageUrl: category.imageUrl || '',
    sortOrder: category.sortOrder ?? 0,
    isActive: category.isActive !== false,
    createdAt: category.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Update local cache
  const localList = getLocalItem<Category[]>(`categories_${storeId}`, []);
  const updatedLocal = localList.some(c => c.id === catId)
    ? localList.map(c => (c.id === catId ? newCategory : c))
    : [...localList, newCategory];
  setLocalItem(`categories_${storeId}`, updatedLocal);
  notifyStoreChange(storeId, 'categories', updatedLocal);

  if (!isSupabaseConfigured()) return catId;

  try {
    const row = fromCategory(newCategory);
    const { error } = await supabase
      .from('categories')
      .upsert({ ...row, id: catId, store_id: storeId }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase saveCategory error:', error.message);
      throw error;
    }

    return catId;
  } catch (err) {
    console.error('saveCategory exception:', err);
    throw err;
  }
}

export async function deleteCategory(storeId = DEFAULT_STORE_ID, categoryId: string): Promise<void> {
  // Update local cache
  const localList = getLocalItem<Category[]>(`categories_${storeId}`, []);
  const updated = localList.filter(c => c.id !== categoryId);
  setLocalItem(`categories_${storeId}`, updated);
  notifyStoreChange(storeId, 'categories', updated);

  if (!isSupabaseConfigured()) return;

  try {
    // Unlink category from any products
    const { data: prods } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId);

    if (prods && prods.length > 0) {
      for (const p of prods) {
        if (Array.isArray(p.category_ids) && p.category_ids.includes(categoryId)) {
          const filtered = p.category_ids.filter((id: string) => id !== categoryId);
          await supabase
            .from('products')
            .update({ category_ids: filtered, updated_at: new Date().toISOString() })
            .eq('id', p.id);
        }
      }
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('store_id', storeId);

    if (error) {
      console.error('Supabase deleteCategory error:', error.message);
      throw error;
    }
  } catch (err) {
    console.error('deleteCategory exception:', err);
    throw err;
  }
}

// ============================================================================
// 3. Products
// ============================================================================

export async function getProducts(storeId = DEFAULT_STORE_ID): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    return getLocalItem<Product[]>(`products_${storeId}`, []);
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId);

    if (error) {
      console.warn('Supabase getProducts error:', error.message);
      return getLocalItem<Product[]>(`products_${storeId}`, []);
    }

    const products = (data || []).map(toProduct);
    setLocalItem(`products_${storeId}`, products);
    return products;
  } catch (err) {
    console.error('getProducts exception:', err);
    return getLocalItem<Product[]>(`products_${storeId}`, []);
  }
}

export async function saveProduct(
  storeId = DEFAULT_STORE_ID,
  product: Partial<Product> & { name: string; price: number }
): Promise<string> {
  const prodId = product.id || `prod_${Date.now()}`;
  const baseSlug = (product.slug || product.name || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'product';
  const slug = product.slug || `${baseSlug}-${prodId.slice(-6)}`;

  const newProduct: Product = {
    id: prodId,
    storeId,
    name: product.name,
    slug,
    description: product.description || '',
    price: Math.max(0, Number(product.price) || 0),
    compareAtPrice: product.compareAtPrice ? Math.max(0, Number(product.compareAtPrice)) : undefined,
    discountPercent: product.discountPercent !== undefined ? Math.min(100, Math.max(0, Number(product.discountPercent))) : 0,
    categoryIds: product.categoryIds || [],
    images: product.images || [],
    primaryImageIndex: product.primaryImageIndex || 0,
    stock: Math.max(0, Number(product.stock) || 0),
    sku: product.sku || '',
    status: product.status || 'active',
    featured: Boolean(product.featured),
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Immediate local cache update
  const localList = getLocalItem<Product[]>(`products_${storeId}`, []);
  const updatedLocal = localList.some(p => p.id === prodId)
    ? localList.map(p => (p.id === prodId ? newProduct : p))
    : [...localList, newProduct];
  setLocalItem(`products_${storeId}`, updatedLocal);
  notifyStoreChange(storeId, 'products', updatedLocal);

  if (!isSupabaseConfigured()) return prodId;

  try {
    const row = fromProduct(newProduct);
    const { error } = await supabase
      .from('products')
      .upsert({ ...row, id: prodId, store_id: storeId }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase saveProduct non-fatal sync notice:', error.message);
    }

    return prodId;
  } catch (err: any) {
    console.warn('saveProduct sync exception (retained in local cache):', err?.message || err);
    return prodId;
  }
}

export async function deleteProduct(storeId = DEFAULT_STORE_ID, productId: string): Promise<void> {
  const localList = getLocalItem<Product[]>(`products_${storeId}`, []);
  const updated = localList.filter(p => p.id !== productId);
  setLocalItem(`products_${storeId}`, updated);
  notifyStoreChange(storeId, 'products', updated);

  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('store_id', storeId);

    if (error) {
      console.warn('Supabase deleteProduct sync notice:', error.message);
    }
  } catch (err: any) {
    console.warn('deleteProduct sync exception:', err?.message || err);
  }
}

// ============================================================================
// 4. Offers
// ============================================================================

export async function getOffers(storeId = DEFAULT_STORE_ID): Promise<Offer[]> {
  if (!isSupabaseConfigured()) {
    return getLocalItem<Offer[]>(`offers_${storeId}`, []);
  }

  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('store_id', storeId);

    if (error) {
      console.warn('Supabase getOffers error:', error.message);
      return getLocalItem<Offer[]>(`offers_${storeId}`, []);
    }

    const offers = (data || []).map(toOffer);
    setLocalItem(`offers_${storeId}`, offers);
    return offers;
  } catch (err) {
    console.error('getOffers exception:', err);
    return getLocalItem<Offer[]>(`offers_${storeId}`, []);
  }
}

export async function saveOffer(
  storeId = DEFAULT_STORE_ID,
  offer: Partial<Offer> & { name: string }
): Promise<string> {
  const offerId = offer.id || `offer_${Date.now()}`;

  const newOffer: Offer = {
    id: offerId,
    storeId,
    name: offer.name,
    description: offer.description || '',
    type: offer.type || 'free_quantity',
    status: offer.status || 'active',
    primaryProductIds: offer.primaryProductIds || [],
    primaryQuantity: Math.min(999, Math.max(1, Number(offer.primaryQuantity) || 1)),
    rewardProductIds: offer.rewardProductIds || [],
    rewardQuantity: Math.min(999, Math.max(1, Number(offer.rewardQuantity) || 1)),
    pricingRule: offer.pricingRule || 'original',
    pricingValue: offer.pricingValue,
    displayStyle: offer.displayStyle || 'floating',
    badgeText: offer.badgeText || '',
    createdAt: offer.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const localList = getLocalItem<Offer[]>(`offers_${storeId}`, []);
  const updatedLocal = localList.some(o => o.id === offerId)
    ? localList.map(o => (o.id === offerId ? newOffer : o))
    : [...localList, newOffer];
  setLocalItem(`offers_${storeId}`, updatedLocal);
  notifyStoreChange(storeId, 'offers', updatedLocal);

  if (!isSupabaseConfigured()) return offerId;

  try {
    const row = fromOffer(newOffer);
    const { error } = await supabase
      .from('offers')
      .upsert({ ...row, id: offerId, store_id: storeId }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase saveOffer error:', error.message);
      throw error;
    }

    return offerId;
  } catch (err) {
    console.error('saveOffer exception:', err);
    throw err;
  }
}

export async function deleteOffer(storeId = DEFAULT_STORE_ID, offerId: string): Promise<void> {
  const localList = getLocalItem<Offer[]>(`offers_${storeId}`, []);
  const updated = localList.filter(o => o.id !== offerId);
  setLocalItem(`offers_${storeId}`, updated);
  notifyStoreChange(storeId, 'offers', updated);

  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', offerId)
      .eq('store_id', storeId);

    if (error) {
      console.error('Supabase deleteOffer error:', error.message);
      throw error;
    }
  } catch (err) {
    console.error('deleteOffer exception:', err);
    throw err;
  }
}

// ============================================================================
// 5. Payment Destinations
// ============================================================================

export async function getPaymentMethods(storeId = DEFAULT_STORE_ID): Promise<PaymentMethod[]> {
  if (!isSupabaseConfigured()) {
    return getLocalItem<PaymentMethod[]>(`payment_methods_${storeId}`, []);
  }

  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('store_id', storeId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('Supabase getPaymentMethods error:', error.message);
      return getLocalItem<PaymentMethod[]>(`payment_methods_${storeId}`, []);
    }

    let methods = (data || []).map(toPaymentMethod);

    // If no COD method exists in store payment methods, guarantee default COD is available
    if (!methods.some(m => m.type === 'cod')) {
      const defaultCod: PaymentMethod = {
        id: `pm_cod_${storeId}`,
        storeId,
        type: 'cod',
        displayName: 'Cash on Delivery (COD)',
        accountTitle: 'Cash on Delivery',
        accountNumber: 'Doorstep Cash Collection',
        iban: '',
        bankName: '',
        instructions: 'Pay cash directly to the courier delivery rider when your parcel arrives at your doorstep. Please keep exact cash ready.',
        qrCodeUrl: '',
        requireScreenshot: false,
        requireTransactionReference: false,
        enabled: true,
        sortOrder: -1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      methods = [defaultCod, ...methods];
      if (isSupabaseConfigured()) {
        try {
          const row = fromPaymentMethod(defaultCod);
          Promise.resolve(supabase.from('payment_methods').upsert(row, { onConflict: 'id' })).catch(() => {});
        } catch {}
      }
    }

    setLocalItem(`payment_methods_${storeId}`, methods);
    return methods;
  } catch (err) {
    console.error('getPaymentMethods exception:', err);
    return getLocalItem<PaymentMethod[]>(`payment_methods_${storeId}`, []);
  }
}

export async function savePaymentMethod(
  storeId = DEFAULT_STORE_ID,
  method: Partial<PaymentMethod> & { displayName: string }
): Promise<string> {
  const methodId = method.id || `pm_${Date.now()}`;

  const newMethod: PaymentMethod = {
    id: methodId,
    storeId,
    type: method.type || 'jazzcash',
    displayName: method.displayName,
    accountTitle: method.accountTitle || '',
    accountNumber: method.accountNumber || '',
    iban: method.iban || '',
    bankName: method.bankName || '',
    instructions: method.instructions || '',
    qrCodeUrl: method.qrCodeUrl || '',
    requireScreenshot: method.requireScreenshot !== false,
    requireTransactionReference: method.requireTransactionReference !== false,
    enabled: method.enabled !== false,
    sortOrder: method.sortOrder ?? 0,
    createdAt: method.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const localList = getLocalItem<PaymentMethod[]>(`payment_methods_${storeId}`, []);
  const updatedLocal = localList.some(m => m.id === methodId)
    ? localList.map(m => (m.id === methodId ? newMethod : m))
    : [...localList, newMethod];
  setLocalItem(`payment_methods_${storeId}`, updatedLocal);
  notifyStoreChange(storeId, 'payment_methods', updatedLocal);

  if (!isSupabaseConfigured()) return methodId;

  try {
    const row = fromPaymentMethod(newMethod);
    const { error } = await supabase
      .from('payment_methods')
      .upsert({ ...row, id: methodId, store_id: storeId }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase savePaymentMethod error:', error.message);
      throw error;
    }

    return methodId;
  } catch (err) {
    console.error('savePaymentMethod exception:', err);
    throw err;
  }
}

export async function deletePaymentMethod(storeId = DEFAULT_STORE_ID, methodId: string): Promise<void> {
  const localList = getLocalItem<PaymentMethod[]>(`payment_methods_${storeId}`, []);
  const updated = localList.filter(m => m.id !== methodId);
  setLocalItem(`payment_methods_${storeId}`, updated);
  notifyStoreChange(storeId, 'payment_methods', updated);

  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', methodId)
      .eq('store_id', storeId);

    if (error) {
      console.error('Supabase deletePaymentMethod error:', error.message);
      throw error;
    }
  } catch (err) {
    console.error('deletePaymentMethod exception:', err);
    throw err;
  }
}

// ============================================================================
// 6. Orders
// ============================================================================

export async function createOrder(
  storeId = DEFAULT_STORE_ID,
  orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const order: Order = {
    ...orderData,
    id: orderId,
    accessToken: orderData.accessToken || `tok_${Math.random().toString(36).substring(2, 10)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Local cache
  const localOrders = getLocalItem<Order[]>(`orders_${storeId}`, []);
  const updatedOrders = [order, ...localOrders];
  setLocalItem(`orders_${storeId}`, updatedOrders);
  notifyStoreChange(storeId, 'orders', updatedOrders);

  if (!isSupabaseConfigured()) return orderId;

  try {
    const row = fromOrder(order);
    let { error } = await supabase
      .from('orders')
      .insert(row);

    if (error && (error.message?.includes('column') || error.message?.includes('schema cache') || error.code === 'PGRST204')) {
      console.warn('createOrder retrying with schema-safe fallback row:', error.message);
      const fallbackRow: Record<string, any> = {
        id: row.id,
        store_id: row.store_id,
        order_number: row.order_number,
        access_token: row.access_token,
        customer: row.customer,
        items: row.items,
        applied_offers: row.applied_offers,
        subtotal: row.subtotal,
        discount_total: row.discount_total,
        delivery_fee: row.delivery_fee,
        total: row.total,
        payment_method_id: row.payment_method_id,
        payment_method_name: row.payment_method_name,
        payment_status: row.payment_status,
        order_status: row.order_status,
        transaction_reference: row.transaction_reference,
        payment_proof_url: row.payment_proof_url,
        safepay_tracker: row.safepay_tracker,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
      const retryRes = await supabase.from('orders').insert(fallbackRow);
      error = retryRes.error;
    }

    if (error) {
      console.error('Supabase createOrder error:', error.message);
      throw error;
    }

    // Append audit trail event for order creation
    await logOrderEvent({
      orderId,
      storeId,
      eventType: 'order_created',
      toStatus: order.orderStatus,
      actorType: 'customer',
      notes: `Order created via ${order.paymentMethodName}`,
      metadata: {
        total: order.total,
        itemCount: order.items?.length || 0,
        paymentStatus: order.paymentStatus,
      },
    });

    return orderId;
  } catch (err) {
    console.error('createOrder exception:', err);
    throw err;
  }
}

export async function getOrders(storeId = DEFAULT_STORE_ID): Promise<Order[]> {
  if (!isSupabaseConfigured()) {
    const local = getLocalItem<Order[]>(`orders_${storeId}`, []);
    return local.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase getOrders error:', error.message);
      const local = getLocalItem<Order[]>(`orders_${storeId}`, []);
      return local.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const orders = (data || []).map(toOrder);
    setLocalItem(`orders_${storeId}`, orders);
    return orders;
  } catch (err) {
    console.error('getOrders exception:', err);
    return getLocalItem<Order[]>(`orders_${storeId}`, []);
  }
}

export async function getOrderById(
  storeId = DEFAULT_STORE_ID,
  orderId: string,
  accessToken?: string
): Promise<Order | null> {
  const local = getLocalItem<Order[]>(`orders_${storeId}`, []);
  const cached = local.find(o => o.id === orderId);
  const resolvedToken = accessToken || cached?.accessToken;

  if (!isSupabaseConfigured()) {
    return cached || null;
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('store_id', storeId)
      .maybeSingle();

    if (!error && data) {
      return toOrder(data);
    }

    // Fallback: If direct SELECT is denied by hardened RLS, try secure customer RPC using order accessToken
    if (resolvedToken) {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_customer_order', {
        p_order_id: orderId,
        p_access_token: resolvedToken,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        const row = rpcData[0];
        return {
          id: row.id,
          storeId: row.store_id,
          orderNumber: row.order_number,
          accessToken: resolvedToken,
          customer: row.customer,
          items: Array.isArray(row.items) ? row.items : [],
          appliedOffers: Array.isArray(row.applied_offers) ? row.applied_offers : [],
          subtotal: Number(row.subtotal) || 0,
          discountTotal: Number(row.discount_total) || 0,
          deliveryFee: Number(row.delivery_fee) || 0,
          total: Number(row.total) || 0,
          paymentMethodId: row.payment_method_id,
          paymentMethodName: row.payment_method_name,
          paymentStatus: row.payment_status,
          orderStatus: row.order_status,
          transactionReference: row.transaction_reference || undefined,
          paymentProofUrl: row.payment_proof_url || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
    }

    if (error) {
      console.warn('Supabase getOrderById error:', error.message);
    }

    return cached || null;
  } catch (err) {
    console.error('getOrderById exception:', err);
    return cached || null;
  }
}

export async function updateOrderStatus(
  storeId = DEFAULT_STORE_ID,
  orderId: string,
  orderStatus: Order['orderStatus'],
  actor: { type: 'admin' | 'system' | 'customer'; id?: string; notes?: string } = { type: 'admin' }
): Promise<void> {
  const local = getLocalItem<Order[]>(`orders_${storeId}`, []);
  const existingOrder = local.find(o => o.id === orderId);
  const fromStatus = existingOrder?.orderStatus;

  const updatedOrders = local.map(o => (o.id === orderId ? { ...o, orderStatus, updatedAt: new Date().toISOString() } : o));
  setLocalItem(`orders_${storeId}`, updatedOrders);
  notifyStoreChange(storeId, 'orders', updatedOrders);

  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase
      .from('orders')
      .update({
        order_status: orderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('store_id', storeId);

    if (error) {
      console.error('Supabase updateOrderStatus error:', error.message);
      throw error;
    }

    // Append audit trail event
    await logOrderEvent({
      orderId,
      storeId,
      eventType: 'status_changed',
      fromStatus,
      toStatus: orderStatus,
      actorType: actor.type,
      actorId: actor.id,
      notes: actor.notes || `Order status updated to ${orderStatus}`,
    });
  } catch (err) {
    console.error('updateOrderStatus exception:', err);
    throw err;
  }
}

export async function updatePaymentStatus(
  storeId = DEFAULT_STORE_ID,
  orderId: string,
  paymentStatus: Order['paymentStatus'],
  actor: { type: 'admin' | 'system' | 'customer'; id?: string; notes?: string } = { type: 'admin' }
): Promise<void> {
  const local = getLocalItem<Order[]>(`orders_${storeId}`, []);
  const existingOrder = local.find(o => o.id === orderId);
  const fromStatus = existingOrder?.paymentStatus;

  const updatedOrders = local.map(o => (o.id === orderId ? { ...o, paymentStatus, updatedAt: new Date().toISOString() } : o));
  setLocalItem(`orders_${storeId}`, updatedOrders);
  notifyStoreChange(storeId, 'orders', updatedOrders);

  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('store_id', storeId);

    if (error) {
      console.error('Supabase updatePaymentStatus error:', error.message);
      throw error;
    }

    // Append audit trail event
    await logOrderEvent({
      orderId,
      storeId,
      eventType: 'payment_status_changed',
      fromStatus,
      toStatus: paymentStatus,
      actorType: actor.type,
      actorId: actor.id,
      notes: actor.notes || `Payment status updated to ${paymentStatus}`,
    });
  } catch (err) {
    console.error('updatePaymentStatus exception:', err);
    throw err;
  }
}

export async function updateOrderPaymentProof(
  storeId = DEFAULT_STORE_ID,
  orderId: string,
  paymentProofUrl?: string,
  transactionReference?: string,
  accessToken?: string
): Promise<void> {
  const local = getLocalItem<Order[]>(`orders_${storeId}`, []);
  const cachedOrder = local.find(o => o.id === orderId);
  const resolvedToken = accessToken || cachedOrder?.accessToken;

  setLocalItem(
    `orders_${storeId}`,
    local.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          paymentProofUrl: paymentProofUrl || o.paymentProofUrl,
          transactionReference: transactionReference || o.transactionReference,
          paymentStatus: paymentProofUrl || transactionReference ? 'payment_submitted' : o.paymentStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return o;
    })
  );

  if (!isSupabaseConfigured()) return;

  try {
    // If accessToken is available, use hardened security definer RPC
    if (resolvedToken) {
      const { error: rpcError } = await supabase.rpc('submit_order_payment_proof', {
        p_order_id: orderId,
        p_access_token: resolvedToken,
        p_payment_proof_url: paymentProofUrl || null,
        p_transaction_reference: transactionReference || null,
      });

      if (!rpcError) {
        // Append audit trail event
        await logOrderEvent({
          orderId,
          storeId,
          eventType: 'payment_proof_submitted',
          fromStatus: 'unpaid',
          toStatus: 'payment_submitted',
          actorType: 'customer',
          notes: 'Customer uploaded proof of payment or entered reference number via secure RPC',
          metadata: {
            hasScreenshot: Boolean(paymentProofUrl),
            transactionReference: transactionReference || null,
          },
        });
        return;
      }
    }

    // Direct table update fallback (for admin sessions or stores where direct update is permitted)
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (paymentProofUrl) updates.payment_proof_url = paymentProofUrl;
    if (transactionReference) updates.transaction_reference = transactionReference;
    if (paymentProofUrl || transactionReference) updates.payment_status = 'payment_submitted';

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .eq('store_id', storeId);

    if (error) {
      console.error('Supabase updateOrderPaymentProof error:', error.message);
      throw error;
    }

    // Append audit trail event
    await logOrderEvent({
      orderId,
      storeId,
      eventType: 'payment_proof_submitted',
      fromStatus: 'unpaid',
      toStatus: 'payment_submitted',
      actorType: 'customer',
      notes: 'Customer uploaded proof of payment or entered reference number',
      metadata: {
        hasScreenshot: Boolean(paymentProofUrl),
        transactionReference: transactionReference || null,
      },
    });
  } catch (err) {
    console.error('updateOrderPaymentProof exception:', err);
    throw err;
  }
}

// ============================================================================
// 6.4 Order Audit Trail (Events)
// ============================================================================

export async function logOrderEvent(event: {
  orderId: string;
  storeId?: string;
  eventType: OrderEventType | string;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorType?: 'admin' | 'system' | 'customer';
  actorId?: string | null;
  notes?: string | null;
  metadata?: Record<string, any>;
}): Promise<void> {
  const storeId = event.storeId || DEFAULT_STORE_ID;
  const localKey = `order_events_${event.orderId}`;
  const localList = getLocalItem<OrderEvent[]>(localKey, []);
  const newLocalEvent: OrderEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    orderId: event.orderId,
    storeId,
    eventType: event.eventType,
    fromStatus: event.fromStatus || null,
    toStatus: event.toStatus || null,
    actorType: event.actorType || 'system',
    actorId: event.actorId || null,
    notes: event.notes || null,
    metadata: event.metadata || {},
    createdAt: new Date().toISOString(),
  };
  setLocalItem(localKey, [...localList, newLocalEvent]);

  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase.rpc('log_order_event', {
      p_order_id: event.orderId,
      p_store_id: storeId,
      p_event_type: event.eventType,
      p_from_status: event.fromStatus || null,
      p_to_status: event.toStatus || null,
      p_actor_type: event.actorType || 'system',
      p_actor_id: event.actorId || null,
      p_notes: event.notes || null,
      p_metadata: event.metadata || {},
    });

    if (error) {
      console.warn('log_order_event RPC notice:', error.message);
    }
  } catch (err) {
    console.warn('logOrderEvent exception:', err);
  }
}

export async function getOrderEvents(orderId: string, accessToken?: string): Promise<OrderEvent[]> {
  const localKey = `order_events_${orderId}`;
  const localList = getLocalItem<OrderEvent[]>(localKey, []);

  if (!isSupabaseConfigured()) {
    return localList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  try {
    // Try RPC first for authorization check (admin or token-guarded customer)
    const { data, error } = await supabase.rpc('get_order_events', {
      p_order_id: orderId,
      p_access_token: accessToken || null,
    });

    if (!error && Array.isArray(data)) {
      const mapped: OrderEvent[] = data.map((d: any) => ({
        id: d.id,
        orderId: d.order_id,
        storeId: d.store_id,
        eventType: d.event_type,
        fromStatus: d.from_status,
        toStatus: d.to_status,
        actorType: d.actor_type,
        actorId: d.actor_id,
        notes: d.notes,
        metadata: d.metadata || {},
        createdAt: d.created_at,
      }));
      setLocalItem(localKey, mapped);
      return mapped;
    }

    // Direct table fallback if authenticated admin
    const { data: directData, error: directErr } = await supabase
      .from('order_events')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (directErr) {
      console.warn('getOrderEvents error:', directErr.message);
      return localList;
    }

    const mapped: OrderEvent[] = (directData || []).map((d: any) => ({
      id: d.id,
      orderId: d.order_id,
      storeId: d.store_id,
      eventType: d.event_type,
      fromStatus: d.from_status,
      toStatus: d.to_status,
      actorType: d.actor_type,
      actorId: d.actor_id,
      notes: d.notes,
      metadata: d.metadata || {},
      createdAt: d.created_at,
    }));
    setLocalItem(localKey, mapped);
    return mapped;
  } catch (err) {
    console.error('getOrderEvents exception:', err);
    return localList;
  }
}

// ============================================================================
// 6.5 Inventory Reservation & Stock Hold (Anti-Race Condition Stored Procedures)
// ============================================================================

/**
 * Creates a 15-minute atomic stock reservation hold for items in checkout.
 * Prevents race conditions where two customers buy the last item simultaneously.
 */
export async function createInventoryHold(
  storeId = DEFAULT_STORE_ID,
  items: Array<{ productId: string; quantity: number }>,
  orderId?: string,
  durationMinutes = 15
): Promise<InventoryHoldResult> {
  if (!items || items.length === 0) {
    return { success: true };
  }

  if (!isSupabaseConfigured()) {
    // Local fallback for offline / mock testing
    return {
      success: true,
      holdId: `local_hold_${Date.now()}`,
      expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString(),
    };
  }

  try {
    const { data, error } = await supabase.rpc('create_inventory_hold', {
      p_store_id: storeId,
      p_items: items.map(it => ({ productId: it.productId, quantity: it.quantity })),
      p_order_id: orderId || null,
      p_duration_minutes: durationMinutes,
    });

    if (error) {
      console.warn('Supabase create_inventory_hold RPC warning:', error.message);
      // If RPC not yet applied in DB, fail open with fallback holdId so customer can still checkout
      return { success: true, holdId: `fallback_hold_${Date.now()}` };
    }

    return (data as InventoryHoldResult) || { success: true };
  } catch (err: any) {
    console.warn('createInventoryHold exception:', err);
    return { success: true, holdId: `fallback_hold_${Date.now()}` };
  }
}

/**
 * Releases an active inventory hold when checkout is cancelled or timed out.
 */
export async function releaseInventoryHold(
  holdId?: string,
  orderId?: string
): Promise<{ success: boolean; releasedCount?: number }> {
  if (!isSupabaseConfigured() || (!holdId && !orderId)) return { success: true };

  try {
    const { data, error } = await supabase.rpc('release_inventory_hold', {
      p_hold_id: holdId || null,
      p_order_id: orderId || null,
    });
    if (error) {
      console.warn('release_inventory_hold RPC warning:', error.message);
      return { success: false };
    }
    return data || { success: true };
  } catch (err) {
    console.warn('releaseInventoryHold exception:', err);
    return { success: false };
  }
}

/**
 * Consumes an active inventory hold and permanently deducts physical stock.
 * Called when an order is finalized (manual transfer placed or Safepay paid).
 */
export async function consumeInventoryHold(
  holdId?: string,
  orderId?: string
): Promise<{ success: boolean; consumedCount?: number }> {
  if (!isSupabaseConfigured() || (!holdId && !orderId)) return { success: true };

  try {
    const { data, error } = await supabase.rpc('consume_inventory_hold', {
      p_hold_id: holdId || null,
      p_order_id: orderId || null,
    });
    if (error) {
      console.warn('consume_inventory_hold RPC warning:', error.message);
      return { success: false };
    }
    return data || { success: true };
  } catch (err) {
    console.warn('consumeInventoryHold exception:', err);
    return { success: false };
  }
}

// ============================================================================
// 7. Real-Time Store Subscription (Supabase Realtime Channel)
// ============================================================================

export function subscribeStoreData(
  storeId = DEFAULT_STORE_ID,
  callbacks: {
    onStoreConfig?: (config: StoreConfig) => void;
    onCategories?: (categories: Category[]) => void;
    onProducts?: (products: Product[]) => void;
    onOffers?: (offers: Offer[]) => void;
    onPaymentMethods?: (methods: PaymentMethod[]) => void;
    onOrders?: (orders: Order[]) => void;
  }
): () => void {
  let isMounted = true;

  // Register in-memory active listener for instant zero-latency callbacks
  const listener: StoreSubscriptionListener = { storeId, callbacks };
  activeStoreSubscriptions.add(listener);

  // Immediate initial load from Supabase / local cache
  const refreshAll = async () => {
    try {
      const [config, categories, products, offers, paymentMethods] = await Promise.all([
        getStoreConfig(storeId),
        getCategories(storeId),
        getProducts(storeId),
        getOffers(storeId),
        getPaymentMethods(storeId),
      ]);

      if (!isMounted) return;
      callbacks.onStoreConfig?.(config);
      callbacks.onCategories?.(categories);
      callbacks.onProducts?.(products);
      callbacks.onOffers?.(offers);
      callbacks.onPaymentMethods?.(paymentMethods);

      if (callbacks.onOrders) {
        const orders = await getOrders(storeId);
        if (isMounted) callbacks.onOrders(orders);
      }
    } catch (err) {
      console.warn('Initial data load warning:', err);
    }
  };

  refreshAll();

  // Listen to window-level custom events for instant cross-component updates
  const handleCustomEvent = (e: Event) => {
    if (!isMounted) return;
    const detail = (e as CustomEvent).detail;
    if (detail && detail.storeId === storeId) {
      if (detail.type === 'products' && callbacks.onProducts) {
        if (detail.data) callbacks.onProducts(detail.data);
        else getProducts(storeId).then(p => isMounted && callbacks.onProducts?.(p));
      } else if (detail.type === 'categories' && callbacks.onCategories) {
        if (detail.data) callbacks.onCategories(detail.data);
        else getCategories(storeId).then(c => isMounted && callbacks.onCategories?.(c));
      } else if (detail.type === 'offers' && callbacks.onOffers) {
        if (detail.data) callbacks.onOffers(detail.data);
        else getOffers(storeId).then(o => isMounted && callbacks.onOffers?.(o));
      } else if (detail.type === 'payment_methods' && callbacks.onPaymentMethods) {
        if (detail.data) callbacks.onPaymentMethods(detail.data);
        else getPaymentMethods(storeId).then(pm => isMounted && callbacks.onPaymentMethods?.(pm));
      } else if (detail.type === 'config' && callbacks.onStoreConfig) {
        if (detail.data) callbacks.onStoreConfig(detail.data);
        else getStoreConfig(storeId).then(cfg => isMounted && callbacks.onStoreConfig?.(cfg));
      } else if (detail.type === 'orders' && callbacks.onOrders) {
        if (detail.data) callbacks.onOrders(detail.data);
        else getOrders(storeId).then(ord => isMounted && callbacks.onOrders?.(ord));
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('store_data_changed', handleCustomEvent);
  }

  // Polling interval as universal fallback (syncs across tabs and ensures updates reflect reliably)
  const pollInterval = setInterval(() => {
    if (!isMounted) return;
    if (!isSupabaseConfigured()) {
      callbacks.onStoreConfig?.(getLocalItem<StoreConfig>(`config_${storeId}`, { ...DEFAULT_STORE_CONFIG, id: storeId }));
      callbacks.onCategories?.(getLocalItem<Category[]>(`categories_${storeId}`, []));
      callbacks.onProducts?.(getLocalItem<Product[]>(`products_${storeId}`, []));
      callbacks.onOffers?.(getLocalItem<Offer[]>(`offers_${storeId}`, []));
      callbacks.onPaymentMethods?.(getLocalItem<PaymentMethod[]>(`payment_methods_${storeId}`, []));
      if (callbacks.onOrders) {
        callbacks.onOrders(getLocalItem<Order[]>(`orders_${storeId}`, []));
      }
    } else {
      // Periodic background verification from Supabase
      getProducts(storeId).then(p => {
        if (isMounted && p && p.length > 0) callbacks.onProducts?.(p);
      }).catch(() => {});
    }
  }, 3500);

  let channel: any = null;
  if (isSupabaseConfigured()) {
    channel = supabase
      .channel(`store_channel_${storeId}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stores', filter: `id=eq.${storeId}` },
        async () => {
          const conf = await getStoreConfig(storeId);
          if (isMounted) callbacks.onStoreConfig?.(conf);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `store_id=eq.${storeId}` },
        async () => {
          const cats = await getCategories(storeId);
          if (isMounted) callbacks.onCategories?.(cats);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `store_id=eq.${storeId}` },
        async () => {
          const prods = await getProducts(storeId);
          if (isMounted) callbacks.onProducts?.(prods);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers', filter: `store_id=eq.${storeId}` },
        async () => {
          const offs = await getOffers(storeId);
          if (isMounted) callbacks.onOffers?.(offs);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_methods', filter: `store_id=eq.${storeId}` },
        async () => {
          const pms = await getPaymentMethods(storeId);
          if (isMounted) callbacks.onPaymentMethods?.(pms);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        async () => {
          if (callbacks.onOrders) {
            const ords = await getOrders(storeId);
            if (isMounted) callbacks.onOrders(ords);
          }
        }
      )
      .subscribe();
  }

  return () => {
    isMounted = false;
    activeStoreSubscriptions.delete(listener);
    clearInterval(pollInterval);
    if (typeof window !== 'undefined') {
      window.removeEventListener('store_data_changed', handleCustomEvent);
    }
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}
