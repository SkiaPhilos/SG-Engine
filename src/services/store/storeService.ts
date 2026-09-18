import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
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
      layout: 'chips', // 'chips' | 'grid' | 'cards'
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
  isConfigured: false, // Initially false so owner sees setup state
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Fetch or initialize the Store Configuration
 */
export async function getStoreConfig(storeId = DEFAULT_STORE_ID): Promise<StoreConfig> {
  const path = `stores/${storeId}`;
  try {
    const docRef = doc(db, 'stores', storeId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as StoreConfig;
    }
    // If not found, return the default template
    return { ...DEFAULT_STORE_CONFIG, id: storeId };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Save / update the Store Configuration
 */
export async function saveStoreConfig(storeId = DEFAULT_STORE_ID, config: Partial<StoreConfig>): Promise<void> {
  const path = `stores/${storeId}`;
  try {
    const docRef = doc(db, 'stores', storeId);
    const updatedData = {
      ...config,
      id: storeId,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, updatedData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------- Categories -----------------

export async function getCategories(storeId = DEFAULT_STORE_ID): Promise<Category[]> {
  const path = `stores/${storeId}/categories`;
  try {
    const colRef = collection(db, 'stores', storeId, 'categories');
    const q = query(colRef, orderBy('sortOrder', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Category));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveCategory(storeId = DEFAULT_STORE_ID, category: Partial<Category> & { name: string }): Promise<string> {
  const catId = category.id || `cat_${Date.now()}`;
  const path = `stores/${storeId}/categories/${catId}`;
  try {
    const docRef = doc(db, 'stores', storeId, 'categories', catId);
    const slug = category.slug || category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const data: Category = {
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
    await setDoc(docRef, data, { merge: true });
    return catId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCategory(storeId = DEFAULT_STORE_ID, categoryId: string): Promise<void> {
  const path = `stores/${storeId}/categories/${categoryId}`;
  try {
    // Unlink category from any products that belong to it to avoid orphaned references
    const productsRef = collection(db, 'stores', storeId, 'products');
    const snap = await getDocs(productsRef);
    for (const prodDoc of snap.docs) {
      const prod = prodDoc.data() as Product;
      if (prod.categoryIds && prod.categoryIds.includes(categoryId)) {
        const filtered = prod.categoryIds.filter(id => id !== categoryId);
        await updateDoc(doc(db, 'stores', storeId, 'products', prodDoc.id), {
          categoryIds: filtered,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    await deleteDoc(doc(db, 'stores', storeId, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------- Products -----------------

export async function getProducts(storeId = DEFAULT_STORE_ID): Promise<Product[]> {
  const path = `stores/${storeId}/products`;
  try {
    const colRef = collection(db, 'stores', storeId, 'products');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveProduct(storeId = DEFAULT_STORE_ID, product: Partial<Product> & { name: string; price: number }): Promise<string> {
  const prodId = product.id || `prod_${Date.now()}`;
  const path = `stores/${storeId}/products/${prodId}`;
  try {
    const docRef = doc(db, 'stores', storeId, 'products', prodId);
    const slug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const data: Product = {
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
    await setDoc(docRef, data, { merge: true });
    return prodId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProduct(storeId = DEFAULT_STORE_ID, productId: string): Promise<void> {
  const path = `stores/${storeId}/products/${productId}`;
  try {
    await deleteDoc(doc(db, 'stores', storeId, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------- Offers -----------------

export async function getOffers(storeId = DEFAULT_STORE_ID): Promise<Offer[]> {
  const path = `stores/${storeId}/offers`;
  try {
    const colRef = collection(db, 'stores', storeId, 'offers');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Offer));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveOffer(storeId = DEFAULT_STORE_ID, offer: Partial<Offer> & { name: string }): Promise<string> {
  const offerId = offer.id || `offer_${Date.now()}`;
  const path = `stores/${storeId}/offers/${offerId}`;
  try {
    const docRef = doc(db, 'stores', storeId, 'offers', offerId);
    const data: Offer = {
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
    await setDoc(docRef, data, { merge: true });
    return offerId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteOffer(storeId = DEFAULT_STORE_ID, offerId: string): Promise<void> {
  const path = `stores/${storeId}/offers/${offerId}`;
  try {
    await deleteDoc(doc(db, 'stores', storeId, 'offers', offerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------- Payment Destinations -----------------

export async function getPaymentMethods(storeId = DEFAULT_STORE_ID): Promise<PaymentMethod[]> {
  const path = `stores/${storeId}/paymentMethods`;
  try {
    const colRef = collection(db, 'stores', storeId, 'paymentMethods');
    const q = query(colRef, orderBy('sortOrder', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as PaymentMethod));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function savePaymentMethod(storeId = DEFAULT_STORE_ID, method: Partial<PaymentMethod> & { displayName: string }): Promise<string> {
  const methodId = method.id || `pm_${Date.now()}`;
  const path = `stores/${storeId}/paymentMethods/${methodId}`;
  try {
    const docRef = doc(db, 'stores', storeId, 'paymentMethods', methodId);
    const data: PaymentMethod = {
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
    await setDoc(docRef, data, { merge: true });
    return methodId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePaymentMethod(storeId = DEFAULT_STORE_ID, methodId: string): Promise<void> {
  const path = `stores/${storeId}/paymentMethods/${methodId}`;
  try {
    await deleteDoc(doc(db, 'stores', storeId, 'paymentMethods', methodId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------- Orders -----------------

export async function createOrder(storeId = DEFAULT_STORE_ID, orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const path = `stores/${storeId}/orders/${orderId}`;
  try {
    const docRef = doc(db, 'stores', storeId, 'orders', orderId);
    const order: Order = {
      ...orderData,
      id: orderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, order);
    return orderId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getOrders(storeId = DEFAULT_STORE_ID): Promise<Order[]> {
  const path = `stores/${storeId}/orders`;
  try {
    const colRef = collection(db, 'stores', storeId, 'orders');
    const snap = await getDocs(colRef);
    const orders = snap.docs.map(d => ({ ...d.data(), id: d.id } as Order));
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getOrderById(storeId = DEFAULT_STORE_ID, orderId: string): Promise<Order | null> {
  const path = `stores/${storeId}/orders/${orderId}`;
  try {
    const docRef = doc(db, 'stores', storeId, 'orders', orderId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Order;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateOrderStatus(
  storeId = DEFAULT_STORE_ID,
  orderId: string,
  orderStatus: Order['orderStatus']
): Promise<void> {
  const path = `stores/${storeId}/orders/${orderId}`;
  try {
    const docRef = doc(db, 'stores', storeId, 'orders', orderId);
    await updateDoc(docRef, {
      orderStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updatePaymentStatus(
  storeId = DEFAULT_STORE_ID,
  orderId: string,
  paymentStatus: Order['paymentStatus']
): Promise<void> {
  const path = `stores/${storeId}/orders/${orderId}`;
  try {
    const docRef = doc(db, 'stores', storeId, 'orders', orderId);
    await updateDoc(docRef, {
      paymentStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateOrderPaymentProof(
  storeId = DEFAULT_STORE_ID,
  orderId: string,
  paymentProofUrl?: string,
  transactionReference?: string
): Promise<void> {
  const path = `stores/${storeId}/orders/${orderId}`;
  try {
    const docRef = doc(db, 'stores', storeId, 'orders', orderId);
    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (paymentProofUrl) updates.paymentProofUrl = paymentProofUrl;
    if (transactionReference) updates.transactionReference = transactionReference;
    if (paymentProofUrl || transactionReference) updates.paymentStatus = 'payment_submitted';
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Setup Real-time listener for store data
 */
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
  const unsubs: (() => void)[] = [];

  // Config listener
  const configDocRef = doc(db, 'stores', storeId);
  const unsubConfig = onSnapshot(
    configDocRef,
    snap => {
      if (snap.exists()) {
        callbacks.onStoreConfig?.(snap.data() as StoreConfig);
      } else {
        callbacks.onStoreConfig?.({ ...DEFAULT_STORE_CONFIG, id: storeId });
      }
    },
    err => handleFirestoreError(err, OperationType.GET, `stores/${storeId}`)
  );
  unsubs.push(unsubConfig);

  // Categories listener
  const catColRef = collection(db, 'stores', storeId, 'categories');
  const unsubCats = onSnapshot(
    catColRef,
    snap => {
      const cats = snap.docs.map(d => ({ ...d.data(), id: d.id } as Category));
      callbacks.onCategories?.(cats.sort((a, b) => a.sortOrder - b.sortOrder));
    },
    err => handleFirestoreError(err, OperationType.LIST, `stores/${storeId}/categories`)
  );
  unsubs.push(unsubCats);

  // Products listener
  const prodColRef = collection(db, 'stores', storeId, 'products');
  const unsubProds = onSnapshot(
    prodColRef,
    snap => {
      const prods = snap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
      callbacks.onProducts?.(prods);
    },
    err => handleFirestoreError(err, OperationType.LIST, `stores/${storeId}/products`)
  );
  unsubs.push(unsubProds);

  // Offers listener
  const offerColRef = collection(db, 'stores', storeId, 'offers');
  const unsubOffers = onSnapshot(
    offerColRef,
    snap => {
      const offs = snap.docs.map(d => ({ ...d.data(), id: d.id } as Offer));
      callbacks.onOffers?.(offs);
    },
    err => handleFirestoreError(err, OperationType.LIST, `stores/${storeId}/offers`)
  );
  unsubs.push(unsubOffers);

  // Payment Methods listener
  const pmColRef = collection(db, 'stores', storeId, 'paymentMethods');
  const unsubPM = onSnapshot(
    pmColRef,
    snap => {
      const pms = snap.docs.map(d => ({ ...d.data(), id: d.id } as PaymentMethod));
      callbacks.onPaymentMethods?.(pms.sort((a, b) => a.sortOrder - b.sortOrder));
    },
    err => handleFirestoreError(err, OperationType.LIST, `stores/${storeId}/paymentMethods`)
  );
  unsubs.push(unsubPM);

  // Orders listener (for admin/store management)
  if (callbacks.onOrders) {
    const ordersColRef = collection(db, 'stores', storeId, 'orders');
    const unsubOrders = onSnapshot(
      ordersColRef,
      snap => {
        const ords = snap.docs.map(d => ({ ...d.data(), id: d.id } as Order));
        callbacks.onOrders?.(
          ords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      },
      err => {
        // Non-fatal if shopper is viewing storefront without admin permissions
        console.warn('Orders subscription note:', err.message);
      }
    );
    unsubs.push(unsubOrders);
  }

  return () => {
    unsubs.forEach(u => u());
  };
}
