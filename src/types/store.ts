/**
 * Core Domain Types for Store Engine
 */

export type ProductStatus = 'active' | 'draft' | 'archived';

export type ProductDisplayPreset =
  | 'standard-grid'
  | 'compact'
  | 'large-cards'
  | 'editorial'
  | 'bento'
  | 'modern'
  | 'minimal';

export interface Product {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  discountPercent?: number; // 0 - 100% individual product discount
  categoryIds: string[];
  images: string[];
  primaryImageIndex: number;
  stock: number;
  sku?: string;
  status: ProductStatus;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OfferType =
  | 'free_quantity'      // Buy X Get Y Free (e.g. Buy 2 Get 1 Free)
  | 'bundle'             // Two or more products together at combined, discounted, or custom price
  | 'free_product'       // Buy Phone Get AirPods FREE
  | 'percentage_discount'; // Spend or buy product with special offer %

export type OfferPricingRule = 'original' | 'percentage_discount' | 'custom_price';

export type OfferDisplayStyle =
  | 'clean'
  | 'floating'
  | 'stacked'
  | 'bundle_hero'
  | 'sale_burst'
  | 'minimal_premium';

export interface Offer {
  id: string;
  storeId: string;
  name: string;
  description: string;
  type: OfferType;
  status: 'active' | 'inactive';
  primaryProductIds: string[];
  primaryQuantity: number; // e.g. 2 for "Buy 2"
  rewardProductIds: string[]; // e.g. AirPods for free product or items in bundle
  rewardQuantity: number; // 1 to 999
  pricingRule: OfferPricingRule;
  pricingValue?: number; // e.g. 10 for 10% off, or 9999 for fixed bundle price
  displayStyle: OfferDisplayStyle;
  badgeText?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethodType =
  | 'jazzcash'
  | 'easypaisa'
  | 'raast'
  | 'bank_transfer'
  | 'nayapay'
  | 'custom_transfer';

export interface PaymentMethod {
  id: string;
  storeId: string;
  type: PaymentMethodType;
  displayName: string;
  accountTitle: string;
  accountNumber: string;
  iban?: string;
  bankName?: string;
  instructions: string;
  qrCodeUrl?: string;
  requireScreenshot: boolean;
  requireTransactionReference: boolean;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderPaymentStatus =
  | 'unpaid'
  | 'payment_submitted'
  | 'pending_verification'
  | 'paid'
  | 'rejected'
  | 'refunded';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  unitPrice: number;
  originalPrice?: number;
  quantity: number;
  totalPrice: number;
  productImage?: string;
  offerId?: string;
  isFreeReward?: boolean;
}

export interface AppliedOfferSummary {
  offerId: string;
  offerName: string;
  offerType: OfferType;
  savingsAmount: number;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes?: string;
}

export interface Order {
  id: string;
  storeId: string;
  orderNumber: string;
  accessToken?: string;
  customer: CustomerDetails;
  items: OrderItem[];
  appliedOffers: AppliedOfferSummary[];
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentStatus: OrderPaymentStatus;
  orderStatus: OrderStatus;
  transactionReference?: string;
  paymentProofUrl?: string;
  safepayTracker?: string;
  safepaySignatureVerified?: boolean;
  safepayPaidAt?: string;
  inventoryHoldId?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderEventType =
  | 'order_created'
  | 'status_changed'
  | 'payment_status_changed'
  | 'payment_proof_submitted'
  | 'safepay_webhook_paid'
  | 'admin_note_added';

export interface OrderEvent {
  id: string;
  orderId: string;
  storeId: string;
  eventType: OrderEventType | string;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorType: 'admin' | 'system' | 'customer';
  actorId?: string | null;
  notes?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface InventoryHoldResult {
  success: boolean;
  holdId?: string;
  expiresAt?: string;
  error?: string;
  message?: string;
  productId?: string;
  productName?: string;
  available?: number;
  requested?: number;
}

export interface SafepayGatewayConfig {
  enabled: boolean;
  environment: 'sandbox' | 'production';
  hasApiKey: boolean;
  hasSecretKey?: boolean;
  hasWebhookSecret: boolean;
  maskedApiKey?: string;
  maskedSecretKey?: string;
  webhookUrl?: string;
  updatedAt?: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
  fontFamily: string;
  borderRadius: string;
}

export type PaymentStatus = OrderPaymentStatus;
export type PaymentType = PaymentMethodType;

export type HomepageSectionType =
  | 'announcement'
  | 'hero'
  | 'featured_products'
  | 'product_grid'
  | 'category_showcase'
  | 'offer_banner'
  | 'promotions'
  | 'offers'
  | 'image_text'
  | 'testimonials'
  | 'faq'
  | 'footer';

export interface HomepageSection {
  id: string;
  type: HomepageSectionType;
  title: string;
  subtitle?: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export type HomepageSectionConfig = HomepageSection;

export interface DeliveryConfig {
  enabled: boolean;
  flatFee: number;
  freeDeliveryThreshold?: number; // orders above this get free delivery
  estimateText?: string;
}

export interface CheckoutConfig {
  requirePhone: boolean;
  requireEmail: boolean;
  requireAddress: boolean;
  orderNotesEnabled: boolean;
}

export interface StoreConfig {
  id: string;
  storeName: string;
  storeDescription: string;
  logoUrl?: string;
  faviconUrl?: string;
  currency: string;
  currencySymbol: string;
  contact: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
  };
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
  };
  themeId: string;
  themeCustomColors?: Partial<ThemeColors>;
  productDisplayPreset: ProductDisplayPreset;
  homepageSections: HomepageSection[];
  deliveryConfig: DeliveryConfig;
  checkoutConfig: CheckoutConfig;
  searchEnabled: boolean;
  isConfigured: boolean; // Flag to indicate if owner ran through initial setup
  ownerUid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  selectedOfferId?: string;
}
