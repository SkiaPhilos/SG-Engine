import {
  StoreConfig,
  Product,
  Category,
  Offer,
  PaymentMethod,
  Order,
} from '../../types/store';

export type PaymentMethodDestination = PaymentMethod;

// ============================================================================
// Database Row Representations (snake_case in PostgreSQL)
// ============================================================================

export interface DbStoreRow {
  id: string;
  store_name: string;
  store_description: string;
  logo_url: string | null;
  favicon_url: string | null;
  currency: string;
  currency_symbol: string;
  contact: any;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp_number: string | null;
  social_links: any;
  theme_id: string;
  theme_custom_colors: any;
  product_display_preset: string;
  homepage_sections: any;
  delivery_config: any;
  checkout_config: any;
  search_enabled: boolean;
  is_configured: boolean;
  owner_uid?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCategoryRow {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbProductRow {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  description: string;
  price: number | string;
  compare_at_price: number | string | null;
  discount_percent: number | null;
  category_ids: string[];
  images: string[];
  primary_image_index: number;
  stock: number;
  sku: string | null;
  status: 'active' | 'draft' | 'archived';
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbOfferRow {
  id: string;
  store_id: string;
  name: string;
  description: string;
  type: any;
  status: 'active' | 'inactive';
  primary_product_ids: string[];
  primary_quantity: number;
  reward_product_ids: string[];
  reward_quantity: number;
  pricing_rule: any;
  pricing_value: number | string | null;
  display_style: any;
  badge_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPaymentMethodRow {
  id: string;
  store_id: string;
  type: any;
  display_name: string;
  account_title: string;
  account_number: string;
  iban: string | null;
  bank_name: string | null;
  instructions: string;
  qr_code_url: string | null;
  require_screenshot: boolean;
  require_transaction_reference: boolean;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbOrderRow {
  id: string;
  store_id: string;
  order_number: string;
  access_token: string;
  customer: any;
  items: any;
  applied_offers: any;
  subtotal: number | string;
  discount_total: number | string;
  delivery_fee: number | string;
  fulfillment_type?: string | null;
  tax_total?: number | string | null;
  tax_category?: string | null;
  tax_percentage?: number | string | null;
  total: number | string;
  payment_method_id: string;
  payment_method_name: string;
  payment_status: any;
  order_status: any;
  transaction_reference: string | null;
  payment_proof_url: string | null;
  safepay_tracker: string | null;
  safepay_signature_verified: boolean;
  safepay_paid_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Model Converters: PostgreSQL Row <-> Application TypeScript Interface
// ============================================================================

export function toStoreConfig(row: DbStoreRow): StoreConfig {
  return {
    id: row.id,
    storeName: row.store_name || 'Store Engine',
    storeDescription: row.store_description || '',
    logoUrl: row.logo_url || undefined,
    faviconUrl: row.favicon_url || undefined,
    currency: row.currency || 'PKR',
    currencySymbol: row.currency_symbol || 'Rs.',
    contact: row.contact || {},
    contactEmail: row.contact_email || undefined,
    contactPhone: row.contact_phone || undefined,
    whatsappNumber: row.whatsapp_number || undefined,
    socialLinks: row.social_links || {},
    themeId: (row.theme_id as any) || 'modern-emerald',
    themeCustomColors: row.theme_custom_colors || undefined,
    productDisplayPreset: (row.product_display_preset as any) || 'standard-grid',
    homepageSections: row.homepage_sections || [],
    deliveryConfig: {
      enabled: row.delivery_config?.enabled !== false,
      flatFee: Number(row.delivery_config?.flatFee) || 250,
      cityFee: Number(row.delivery_config?.cityFee) || 150,
      countryFee: Number(row.delivery_config?.countryFee) || 250,
      ownerCity: row.delivery_config?.ownerCity || 'Lahore',
      ownerCountry: row.delivery_config?.ownerCountry || 'Pakistan',
      shopAddress: row.delivery_config?.shopAddress || 'My Shop Address',
      pickupEnabled: row.delivery_config?.pickupEnabled !== false,
      freeDeliveryThreshold: row.delivery_config?.freeDeliveryThreshold !== undefined ? Number(row.delivery_config.freeDeliveryThreshold) : 3000,
      estimateText: row.delivery_config?.estimateText || '2-4 business days nationwide',
    },
    taxConfig: row.delivery_config?.taxConfig || (row as any).tax_config || {
      enabled: false,
      category: 'GST / Sales Tax',
      percentage: 0,
    },
    checkoutConfig: row.checkout_config || {
      requirePhone: true,
      requireEmail: true,
      requireAddress: true,
      orderNotesEnabled: true,
    },
    searchEnabled: row.search_enabled ?? true,
    isConfigured: row.is_configured ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromStoreConfig(config: Partial<StoreConfig>): Partial<DbStoreRow> {
  const row: Partial<DbStoreRow> = {
    updated_at: new Date().toISOString(),
  };
  if (config.id !== undefined) row.id = config.id;
  if (config.storeName !== undefined) row.store_name = config.storeName;
  if (config.storeDescription !== undefined) row.store_description = config.storeDescription;
  if (config.logoUrl !== undefined) row.logo_url = config.logoUrl || null;
  if (config.faviconUrl !== undefined) row.favicon_url = config.faviconUrl || null;
  if (config.currency !== undefined) row.currency = config.currency;
  if (config.currencySymbol !== undefined) row.currency_symbol = config.currencySymbol;
  if (config.contact !== undefined) row.contact = config.contact;
  if (config.contactEmail !== undefined) row.contact_email = config.contactEmail || null;
  if (config.contactPhone !== undefined) row.contact_phone = config.contactPhone || null;
  if (config.whatsappNumber !== undefined) row.whatsapp_number = config.whatsappNumber || null;
  if (config.socialLinks !== undefined) row.social_links = config.socialLinks;
  if (config.themeId !== undefined) row.theme_id = config.themeId;
  if (config.themeCustomColors !== undefined) row.theme_custom_colors = config.themeCustomColors || null;
  if (config.productDisplayPreset !== undefined) row.product_display_preset = config.productDisplayPreset;
  if (config.homepageSections !== undefined) row.homepage_sections = config.homepageSections;
  if (config.deliveryConfig !== undefined || config.taxConfig !== undefined) {
    row.delivery_config = {
      ...(config.deliveryConfig || {}),
      taxConfig: config.taxConfig,
    };
  }
  if (config.checkoutConfig !== undefined) row.checkout_config = config.checkoutConfig;
  if (config.searchEnabled !== undefined) row.search_enabled = config.searchEnabled;
  if (config.isConfigured !== undefined) row.is_configured = config.isConfigured;
  return row;
}

export function toCategory(row: DbCategoryRow): Category {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    imageUrl: row.image_url || undefined,
    sortOrder: row.sort_order || 0,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromCategory(cat: Partial<Category>): Partial<DbCategoryRow> {
  const row: Partial<DbCategoryRow> = {
    updated_at: new Date().toISOString(),
  };
  if (cat.id !== undefined) row.id = cat.id;
  if (cat.storeId !== undefined) row.store_id = cat.storeId;
  if (cat.name !== undefined) row.name = cat.name;
  if (cat.slug !== undefined) row.slug = cat.slug;
  if (cat.description !== undefined) row.description = cat.description || null;
  if (cat.imageUrl !== undefined) row.image_url = cat.imageUrl || null;
  if (cat.sortOrder !== undefined) row.sort_order = cat.sortOrder;
  if (cat.isActive !== undefined) row.is_active = cat.isActive;
  return row;
}

export function toProduct(row: DbProductRow): Product {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    price: Number(row.price) || 0,
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
    discountPercent: row.discount_percent ?? undefined,
    categoryIds: Array.isArray(row.category_ids) ? row.category_ids : [],
    images: Array.isArray(row.images) ? row.images : [],
    primaryImageIndex: row.primary_image_index || 0,
    stock: row.stock || 0,
    sku: row.sku || undefined,
    status: row.status || 'active',
    featured: Boolean(row.featured),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromProduct(prod: Partial<Product>): Partial<DbProductRow> {
  const row: Partial<DbProductRow> = {
    updated_at: new Date().toISOString(),
  };
  if (prod.id !== undefined) row.id = prod.id;
  if (prod.storeId !== undefined) row.store_id = prod.storeId;
  if (prod.name !== undefined) row.name = prod.name;
  if (prod.slug !== undefined) row.slug = prod.slug;
  if (prod.description !== undefined) row.description = prod.description;
  if (prod.price !== undefined) row.price = prod.price;
  if (prod.compareAtPrice !== undefined) row.compare_at_price = prod.compareAtPrice ?? null;
  if (prod.discountPercent !== undefined) row.discount_percent = prod.discountPercent ?? null;
  if (prod.categoryIds !== undefined) row.category_ids = prod.categoryIds;
  if (prod.images !== undefined) row.images = prod.images;
  if (prod.primaryImageIndex !== undefined) row.primary_image_index = prod.primaryImageIndex;
  if (prod.stock !== undefined) row.stock = prod.stock;
  if (prod.sku !== undefined) row.sku = prod.sku || null;
  if (prod.status !== undefined) row.status = prod.status;
  if (prod.featured !== undefined) row.featured = prod.featured;
  return row;
}

export function toOffer(row: DbOfferRow): Offer {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    description: row.description || '',
    type: row.type,
    status: row.status || 'active',
    primaryProductIds: Array.isArray(row.primary_product_ids) ? row.primary_product_ids : [],
    primaryQuantity: row.primary_quantity || 1,
    rewardProductIds: Array.isArray(row.reward_product_ids) ? row.reward_product_ids : [],
    rewardQuantity: row.reward_quantity || 1,
    pricingRule: row.pricing_rule || 'original',
    pricingValue: row.pricing_value ? Number(row.pricing_value) : undefined,
    displayStyle: row.display_style || 'clean',
    badgeText: row.badge_text || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromOffer(offer: Partial<Offer>): Partial<DbOfferRow> {
  const row: Partial<DbOfferRow> = {
    updated_at: new Date().toISOString(),
  };
  if (offer.id !== undefined) row.id = offer.id;
  if (offer.storeId !== undefined) row.store_id = offer.storeId;
  if (offer.name !== undefined) row.name = offer.name;
  if (offer.description !== undefined) row.description = offer.description;
  if (offer.type !== undefined) row.type = offer.type;
  if (offer.status !== undefined) row.status = offer.status;
  if (offer.primaryProductIds !== undefined) row.primary_product_ids = offer.primaryProductIds;
  if (offer.primaryQuantity !== undefined) row.primary_quantity = offer.primaryQuantity;
  if (offer.rewardProductIds !== undefined) row.reward_product_ids = offer.rewardProductIds;
  if (offer.rewardQuantity !== undefined) row.reward_quantity = offer.rewardQuantity;
  if (offer.pricingRule !== undefined) row.pricing_rule = offer.pricingRule;
  if (offer.pricingValue !== undefined) row.pricing_value = offer.pricingValue ?? null;
  if (offer.displayStyle !== undefined) row.display_style = offer.displayStyle;
  if (offer.badgeText !== undefined) row.badge_text = offer.badgeText || null;
  return row;
}

export function toPaymentMethod(row: DbPaymentMethodRow): PaymentMethodDestination {
  return {
    id: row.id,
    storeId: row.store_id,
    type: row.type,
    displayName: row.display_name,
    accountTitle: row.account_title,
    accountNumber: row.account_number,
    iban: row.iban || undefined,
    bankName: row.bank_name || undefined,
    instructions: row.instructions || '',
    qrCodeUrl: row.qr_code_url || undefined,
    requireScreenshot: Boolean(row.require_screenshot),
    requireTransactionReference: Boolean(row.require_transaction_reference),
    enabled: Boolean(row.enabled),
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromPaymentMethod(pm: Partial<PaymentMethodDestination>): Partial<DbPaymentMethodRow> {
  const row: Partial<DbPaymentMethodRow> = {
    updated_at: new Date().toISOString(),
  };
  if (pm.id !== undefined) row.id = pm.id;
  if (pm.storeId !== undefined) row.store_id = pm.storeId;
  if (pm.type !== undefined) row.type = pm.type;
  if (pm.displayName !== undefined) row.display_name = pm.displayName;
  if (pm.accountTitle !== undefined) row.account_title = pm.accountTitle;
  if (pm.accountNumber !== undefined) row.account_number = pm.accountNumber;
  if (pm.iban !== undefined) row.iban = pm.iban || null;
  if (pm.bankName !== undefined) row.bank_name = pm.bankName || null;
  if (pm.instructions !== undefined) row.instructions = pm.instructions;
  if (pm.qrCodeUrl !== undefined) row.qr_code_url = pm.qrCodeUrl || null;
  if (pm.requireScreenshot !== undefined) row.require_screenshot = pm.requireScreenshot;
  if (pm.requireTransactionReference !== undefined) row.require_transaction_reference = pm.requireTransactionReference;
  if (pm.enabled !== undefined) row.enabled = pm.enabled;
  if (pm.sortOrder !== undefined) row.sort_order = pm.sortOrder;
  return row;
}

export function toOrder(row: any): Order {
  return {
    id: row.id,
    storeId: row.store_id,
    orderNumber: row.order_number,
    accessToken: row.access_token,
    customer: row.customer,
    items: Array.isArray(row.items) ? row.items : [],
    appliedOffers: Array.isArray(row.applied_offers) ? row.applied_offers : [],
    subtotal: Number(row.subtotal) || 0,
    discountTotal: Number(row.discount_total) || 0,
    deliveryFee: Number(row.delivery_fee) || 0,
    fulfillmentType: (row.fulfillment_type as any) || (row.customer?.fulfillmentType as any) || 'delivery',
    taxTotal: row.tax_total !== undefined && row.tax_total !== null ? Number(row.tax_total) : (row.customer?.taxTotal !== undefined ? Number(row.customer.taxTotal) : undefined),
    taxCategory: row.tax_category || row.customer?.taxCategory || undefined,
    taxPercentage: row.tax_percentage !== undefined && row.tax_percentage !== null ? Number(row.tax_percentage) : (row.customer?.taxPercentage !== undefined ? Number(row.customer.taxPercentage) : undefined),
    total: Number(row.total) || 0,
    paymentMethodId: row.payment_method_id,
    paymentMethodName: row.payment_method_name,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    transactionReference: row.transaction_reference || undefined,
    paymentProofUrl: row.payment_proof_url || undefined,
    safepayTracker: row.safepay_tracker || undefined,
    safepaySignatureVerified: row.safepay_signature_verified,
    safepayPaidAt: row.safepay_paid_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isValidUUID(val: any): boolean {
  if (typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function fromOrder(ord: Partial<Order>): Partial<DbOrderRow> {
  const row: Partial<DbOrderRow> = {
    updated_at: new Date().toISOString(),
  };
  if (ord.id !== undefined) row.id = ord.id;
  if (ord.storeId !== undefined) row.store_id = ord.storeId;
  if (ord.orderNumber !== undefined) row.order_number = ord.orderNumber;
  if (ord.accessToken !== undefined) {
    row.access_token = isValidUUID(ord.accessToken) ? ord.accessToken : generateUUID();
  } else {
    row.access_token = generateUUID();
  }

  // Safely embed fulfillment & tax fields inside customer JSONB so any DB schema accepts it without error
  const customerObj = {
    ...(ord.customer || {}),
    ...(ord.fulfillmentType !== undefined ? { fulfillmentType: ord.fulfillmentType } : {}),
    ...(ord.taxTotal !== undefined ? { taxTotal: ord.taxTotal } : {}),
    ...(ord.taxCategory !== undefined ? { taxCategory: ord.taxCategory } : {}),
    ...(ord.taxPercentage !== undefined ? { taxPercentage: ord.taxPercentage } : {}),
  };
  row.customer = customerObj;

  if (ord.items !== undefined) row.items = ord.items;
  if (ord.appliedOffers !== undefined) row.applied_offers = ord.appliedOffers;
  if (ord.subtotal !== undefined) row.subtotal = ord.subtotal;
  if (ord.discountTotal !== undefined) row.discount_total = ord.discountTotal;
  if (ord.deliveryFee !== undefined) row.delivery_fee = ord.deliveryFee;
  if (ord.total !== undefined) row.total = ord.total;
  if (ord.paymentMethodId !== undefined) row.payment_method_id = ord.paymentMethodId;
  if (ord.paymentMethodName !== undefined) row.payment_method_name = ord.paymentMethodName;
  if (ord.paymentStatus !== undefined) row.payment_status = ord.paymentStatus;
  if (ord.orderStatus !== undefined) row.order_status = ord.orderStatus;
  if (ord.transactionReference !== undefined) row.transaction_reference = ord.transactionReference || null;
  if (ord.paymentProofUrl !== undefined) row.payment_proof_url = ord.paymentProofUrl || null;
  if (ord.safepayTracker !== undefined) row.safepay_tracker = ord.safepayTracker || null;
  if (ord.safepaySignatureVerified !== undefined) row.safepay_signature_verified = ord.safepaySignatureVerified;
  if (ord.safepayPaidAt !== undefined) row.safepay_paid_at = ord.safepayPaidAt || null;
  return row;
}
