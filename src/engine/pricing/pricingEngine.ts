import { Product, Offer, DeliveryConfig, CartItem, OrderItem, AppliedOfferSummary } from '../../types/store';

export interface PricingCalculationResult {
  items: OrderItem[];
  appliedOffers: AppliedOfferSummary[];
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  qualifiesForFreeDelivery: boolean;
  freeDeliveryThresholdRemaining?: number;
}

/**
 * Calculates authoritative unit price for a single product with its direct discount.
 */
export function calculateProductPrice(product: Product): {
  unitPrice: number;
  originalPrice: number;
  savings: number;
  discountPercent: number;
} {
  const original = Number(product.price) || 0;
  const discountPercent = Math.min(100, Math.max(0, Number(product.discountPercent) || 0));
  const unitPrice = discountPercent > 0 ? Math.round(original * (1 - discountPercent / 100)) : original;
  const savings = Math.max(0, original - unitPrice);

  return {
    unitPrice,
    originalPrice: original,
    savings,
    discountPercent,
  };
}

/**
 * Authoritative central pricing calculation for cart and checkout.
 */
export function calculateOrderTotals(
  cartItems: CartItem[],
  products: Product[],
  offers: Offer[],
  deliveryConfig: DeliveryConfig
): PricingCalculationResult {
  const productMap = new Map<string, Product>();
  products.forEach(p => productMap.set(p.id, p));

  const activeOffers = offers.filter(o => o.status === 'active');
  const appliedOffers: AppliedOfferSummary[] = [];

  const items: OrderItem[] = [];
  let subtotal = 0;
  let totalIndividualDiscount = 0;
  let offerSavingsTotal = 0;

  // 1. Process cart items with individual product pricing
  for (const cartItem of cartItems) {
    const product = productMap.get(cartItem.productId);
    if (!product) continue;

    const { unitPrice, originalPrice, savings } = calculateProductPrice(product);
    const qty = Math.max(1, Number(cartItem.quantity) || 1);
    const lineTotal = unitPrice * qty;

    subtotal += lineTotal;
    totalIndividualDiscount += savings * qty;

    items.push({
      productId: product.id,
      productName: product.name,
      unitPrice,
      originalPrice,
      quantity: qty,
      totalPrice: lineTotal,
      productImage: product.images?.[product.primaryImageIndex || 0] || product.images?.[0] || '',
      offerId: cartItem.selectedOfferId,
    });
  }

  // 2. Evaluate active offers
  for (const offer of activeOffers) {
    if (offer.type === 'free_quantity') {
      // Buy X Get Y Free: e.g. Buy 2 Get 1 Free
      for (const primaryId of offer.primaryProductIds) {
        const item = items.find(i => i.productId === primaryId);
        if (item) {
          const buyQty = Math.max(1, offer.primaryQuantity || 1);
          const freeQty = Math.max(1, offer.rewardQuantity || 1);
          const bundleUnit = buyQty + freeQty;

          if (item.quantity >= buyQty) {
            const applicableSets = Math.floor(item.quantity / buyQty);
            const totalFreeCount = applicableSets * freeQty;
            const savings = totalFreeCount * item.unitPrice;

            if (savings > 0) {
              offerSavingsTotal += savings;
              appliedOffers.push({
                offerId: offer.id,
                offerName: offer.name,
                offerType: offer.type,
                savingsAmount: savings,
              });

              // Add free reward line item if applicable
              const product = productMap.get(primaryId);
              if (product) {
                items.push({
                  productId: product.id,
                  productName: `${product.name} (Offer: ${offer.name})`,
                  unitPrice: 0,
                  originalPrice: item.unitPrice,
                  quantity: totalFreeCount,
                  totalPrice: 0,
                  productImage: product.images?.[0] || '',
                  offerId: offer.id,
                  isFreeReward: true,
                });
              }
            }
          }
        }
      }
    } else if (offer.type === 'bundle') {
      // Check if cart has all products in bundle
      const allPresent = offer.primaryProductIds.every(pid => items.some(i => i.productId === pid));
      if (allPresent && offer.primaryProductIds.length > 0) {
        const bundleItems = items.filter(i => offer.primaryProductIds.includes(i.productId));
        const combinedOriginal = bundleItems.reduce((acc, i) => acc + i.unitPrice, 0);

        let savings = 0;
        if (offer.pricingRule === 'percentage_discount' && offer.pricingValue) {
          savings = Math.round(combinedOriginal * (offer.pricingValue / 100));
        } else if (offer.pricingRule === 'custom_price' && offer.pricingValue !== undefined) {
          savings = Math.max(0, combinedOriginal - offer.pricingValue);
        }

        if (savings > 0) {
          offerSavingsTotal += savings;
          subtotal = Math.max(0, subtotal - savings);
          appliedOffers.push({
            offerId: offer.id,
            offerName: offer.name,
            offerType: offer.type,
            savingsAmount: savings,
          });
        }
      }
    } else if (offer.type === 'free_product') {
      // Buy Phone Get AirPods FREE
      const primaryPresent = offer.primaryProductIds.some(pid => {
        const found = items.find(i => i.productId === pid);
        return found && found.quantity >= (offer.primaryQuantity || 1);
      });

      if (primaryPresent && offer.rewardProductIds.length > 0) {
        for (const rewardPid of offer.rewardProductIds) {
          const rewardProduct = productMap.get(rewardPid);
          if (rewardProduct) {
            const freeCount = Math.max(1, offer.rewardQuantity || 1);
            const rewardUnitPrice = calculateProductPrice(rewardProduct).unitPrice;
            const savings = rewardUnitPrice * freeCount;

            offerSavingsTotal += savings;
            appliedOffers.push({
              offerId: offer.id,
              offerName: offer.name,
              offerType: offer.type,
              savingsAmount: savings,
            });

            items.push({
              productId: rewardProduct.id,
              productName: `${rewardProduct.name} [FREE GIFT]`,
              unitPrice: 0,
              originalPrice: rewardUnitPrice,
              quantity: freeCount,
              totalPrice: 0,
              productImage: rewardProduct.images?.[0] || '',
              offerId: offer.id,
              isFreeReward: true,
            });
          }
        }
      }
    }
  }

  // 3. Calculate delivery fee
  let deliveryFee = 0;
  let qualifiesForFreeDelivery = false;
  let freeDeliveryThresholdRemaining: number | undefined;

  if (deliveryConfig.enabled) {
    const flatFee = Math.max(0, Number(deliveryConfig.flatFee) || 0);
    const threshold = deliveryConfig.freeDeliveryThreshold;

    if (threshold !== undefined && threshold > 0) {
      if (subtotal >= threshold) {
        deliveryFee = 0;
        qualifiesForFreeDelivery = true;
      } else {
        deliveryFee = flatFee;
        freeDeliveryThresholdRemaining = Math.max(0, threshold - subtotal);
      }
    } else {
      deliveryFee = flatFee;
    }
  }

  const finalTotal = Math.max(0, subtotal + deliveryFee);

  return {
    items,
    appliedOffers,
    subtotal,
    discountTotal: totalIndividualDiscount + offerSavingsTotal,
    deliveryFee,
    total: finalTotal,
    qualifiesForFreeDelivery,
    freeDeliveryThresholdRemaining,
  };
}
