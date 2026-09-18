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
    freeDeliveryThreshold: 3000,
    estimateText: '2-4 business days',
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

export async function saveStoreConfig(storeId = DEFAULT_STORE_ID, config: Partial<StoreConfig>): Promise<void> {
  const merged: StoreConfig = {
    ...DEFAULT_STORE_CONFIG,
    ...(getLocalItem<StoreConfig>(`config_${storeId}`, DEFAULT_STORE_CONFIG)),
    ...config,
    id: storeId,
    updatedAt: new Date().toISOString(),
  };
  setLocalItem(`config_${storeId}`, merged);

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
  setLocalItem(`categories_${storeId}`, localList.filter(c => c.id !== categoryId));

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
  const slug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

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

  // Local cache
  const localList = getLocalItem<Product[]>(`products_${storeId}`, []);
  const updatedLocal = localList.some(p => p.id === prodId)
    ? localList.map(p => (p.id === prodId ? newProduct : p))
    : [...localList, newProduct];
  setLocalItem(`products_${storeId}`, updatedLocal);

  if (!isSupabaseConfigured()) return prodId;

  try {
    const row = fromProduct(newProduct);
    const { error } = await supabase
      .from('products')
      .upsert({ ...row, id: prodId, store_id: storeId }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase saveProduct error:', error.message);
      throw error;
    }

    return prodId;
  } catch (err) {
    console.error('saveProduct exception:', err);
    throw err;
  }
}

export async function deleteProduct(storeId = DEFAULT_STORE_ID, productId: string): Promise<void> {
  const localList = getLocalItem<Product[]>(`products_${storeId}`, []);
  setLocalItem(`products_${storeId}`, localList.filter(p => p.id !== productId));

  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('store_id', storeId);

    if (error) {
      console.error('Supabase deleteProduct error:', error.message);
      throw error;
    }
  } catch (err) {
    console.error('deleteProduct exception:', err);
    throw err;
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
  setLocalItem(`offers_${storeId}`, localList.filter(o => o.id !== offerId));

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

    const methods = (data || []).map(toPaymentMethod);
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
  setLocalItem(`payment_methods_${storeId}`, localList.filter(m => m.id !== methodId));

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
  setLocalItem(`orders_${storeId}`, [order, ...localOrders]);

  if (!isSupabaseConfigured()) return orderId;

  try {
    const row = fromOrder(order);
    const { error } = await supabase
      .from('orders')
      .insert(row);

    if (error) {
      console.error('Supabase createOrder error:', error.message);
      throw error;
    }

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

export async function getOrderById(storeId = DEFAULT_STORE_ID, orderId: string): Promise<Order | null> {
  const local = getLocalItem<Order[]>(`orders_${storeId}`, []);
  const cached = local.find(o => o.id === orderId);

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

    if (error) {
      console.warn('Supabase getOrderById error:', error.message);
      return cached || null;
    }

    return data ? toOrder(data) : cached || null;
  } catch (err) {
    console.error('getOrderById exception:', err);
    return cached || null;
  }
}

export async function updateOrderStatus(
  storeId = DEFAULT_STORE_ID,
  orderId: string,
  orderStatus: Order['orderStatus']
): Promise<void> {
  const local = getLocalItem<Order[]>(`orders_${storeId}`, []);
  setLocalItem(
    `orders_${storeId}`,
    local.map(o => (o.id === orderId ? { ...o, orderStatus, updatedAt: new Date().toISOString() } : o))
  );

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
  } catch (err) {
    console.error('updateOrderStatus exception:', err);
    throw err;
  }
}

export async function updatePaymentStatus(
  storeId = DEFAULT_STORE_ID,
  orderId: string,
  paymentStatus: Order['paymentStatus']
): Promise<void> {
  const local = getLocalItem<Order[]>(`orders_${storeId}`, []);
  setLocalItem(
    `orders_${storeId}`,
    local.map(o => (o.id === orderId ? { ...o, paymentStatus, updatedAt: new Date().toISOString() } : o))
  );

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
  } catch (err) {
    console.error('updatePaymentStatus exception:', err);
    throw err;
  }
}

export async function updateOrderPaymentProof(
  storeId = DEFAULT_STORE_ID,
  orderId: string,
  paymentProofUrl?: string,
  transactionReference?: string
): Promise<void> {
  const local = getLocalItem<Order[]>(`orders_${storeId}`, []);
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
  } catch (err) {
    console.error('updateOrderPaymentProof exception:', err);
    throw err;
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

  // If Supabase credentials are not configured, poll local changes periodically or return no-op
  if (!isSupabaseConfigured()) {
    const interval = setInterval(() => {
      if (isMounted) {
        callbacks.onStoreConfig?.(getLocalItem<StoreConfig>(`config_${storeId}`, { ...DEFAULT_STORE_CONFIG, id: storeId }));
        callbacks.onCategories?.(getLocalItem<Category[]>(`categories_${storeId}`, []));
        callbacks.onProducts?.(getLocalItem<Product[]>(`products_${storeId}`, []));
        callbacks.onOffers?.(getLocalItem<Offer[]>(`offers_${storeId}`, []));
        callbacks.onPaymentMethods?.(getLocalItem<PaymentMethod[]>(`payment_methods_${storeId}`, []));
        if (callbacks.onOrders) {
          callbacks.onOrders(getLocalItem<Order[]>(`orders_${storeId}`, []));
        }
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }

  // Subscribe to Supabase Postgres real-time changes
  const channel = supabase
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

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
}
