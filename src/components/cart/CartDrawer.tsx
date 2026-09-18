import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Sparkles, Truck, Check } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    pricing,
    formatPrice,
    themeColors,
    config,
    setCurrentView,
  } = useStore();

  if (!isCartOpen) return null;

  const handleCheckoutClick = () => {
    setIsCartOpen(false);
    setCurrentView('checkout');
  };

  const deliveryThreshold = config.deliveryConfig?.freeDeliveryThreshold;
  const progressPercent = deliveryThreshold
    ? Math.min(100, Math.round((pricing.subtotal / deliveryThreshold) * 100))
    : 100;

  return (
    <div
      id="cart-drawer-backdrop"
      className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs transition-opacity"
      onClick={() => setIsCartOpen(false)}
    >
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          id="cart-drawer-panel"
          onClick={e => e.stopPropagation()}
          className="w-screen max-w-md shadow-2xl flex flex-col transition-all"
          style={{
            backgroundColor: themeColors.surface,
            color: themeColors.text,
            borderLeft: `1px solid ${themeColors.border}`,
          }}
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b flex items-center justify-between" style={{ borderColor: themeColors.border }}>
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: themeColors.primary }}
              >
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold">Shopping Cart ({cart.reduce((a, b) => a + b.quantity, 0)})</h2>
            </div>

            <button
              id="close-cart-btn"
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Delivery threshold banner */}
          {config.deliveryConfig?.enabled && deliveryThreshold && deliveryThreshold > 0 && (
            <div className="px-4 sm:px-6 py-3 border-b text-xs" style={{ borderColor: themeColors.border, backgroundColor: `${themeColors.primary}08` }}>
              <div className="flex items-center justify-between font-semibold mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" style={{ color: themeColors.primary }} />
                  {pricing.qualifiesForFreeDelivery ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">You unlocked FREE delivery!</span>
                  ) : (
                    <span>
                      Add <strong className="font-bold">{formatPrice(pricing.freeDeliveryThresholdRemaining || 0)}</strong> more for FREE delivery
                    </span>
                  )}
                </span>
                <span className="font-mono text-[11px]">{progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                <div
                  className="h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: pricing.qualifiesForFreeDelivery ? '#10b981' : themeColors.primary,
                  }}
                />
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {pricing.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <ShoppingBag className="w-16 h-16 opacity-30" style={{ color: themeColors.primary }} />
                <p className="font-bold text-base">Your cart is empty</p>
                <p className="text-xs max-w-xs" style={{ color: themeColors.muted }}>
                  Explore the catalog to discover products and special promotional offers.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              pricing.items.map((item, idx) => (
                <div
                  key={`${item.productId}-${idx}`}
                  className="flex items-center gap-3 p-3 rounded-xl border relative"
                  style={{
                    borderColor: item.isFreeReward ? '#10b981' : themeColors.border,
                    backgroundColor: item.isFreeReward ? '#10b98108' : 'transparent',
                  }}
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0 border" style={{ borderColor: themeColors.border }}>
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
                        Item
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs sm:text-sm font-bold truncate" style={{ color: themeColors.text }}>
                        {item.productName}
                      </h4>
                      {!item.isFreeReward && (
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-neutral-400 hover:text-red-500 p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Price & Quantity */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs sm:text-sm font-black" style={{ color: item.isFreeReward ? '#10b981' : themeColors.primary }}>
                          {item.isFreeReward ? 'FREE REWARD' : formatPrice(item.totalPrice)}
                        </span>
                        {!item.isFreeReward && item.originalPrice && item.originalPrice > item.unitPrice && (
                          <span className="text-[10px] line-through" style={{ color: themeColors.muted }}>
                            {formatPrice(item.originalPrice * item.quantity)}
                          </span>
                        )}
                      </div>

                      {/* Quantity buttons */}
                      {!item.isFreeReward ? (
                        <div
                          className="flex items-center border rounded-lg overflow-hidden h-7"
                          style={{ borderColor: themeColors.border }}
                        >
                          <button
                            onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                            className="px-2 h-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                            className="px-2 h-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-sm bg-emerald-100 dark:bg-emerald-950">
                          Qty: {item.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Applied offers summary */}
          {pricing.appliedOffers.length > 0 && (
            <div className="px-4 sm:px-6 py-2.5 border-t bg-emerald-500/10 border-emerald-500/20">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Offers Applied:</span>
              </div>
              <ul className="text-[11px] mt-1 space-y-0.5 text-emerald-800 dark:text-emerald-200">
                {pricing.appliedOffers.map((o, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{o.offerName}</span>
                    <span className="font-semibold">-{formatPrice(o.savingsAmount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer calculation & checkout */}
          {pricing.items.length > 0 && (
            <div className="p-4 sm:p-6 border-t space-y-3" style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between" style={{ color: themeColors.muted }}>
                  <span>Subtotal</span>
                  <span className="font-semibold" style={{ color: themeColors.text }}>{formatPrice(pricing.subtotal)}</span>
                </div>

                {pricing.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Discounts & Promotions</span>
                    <span>-{formatPrice(pricing.discountTotal)}</span>
                  </div>
                )}

                <div className="flex justify-between" style={{ color: themeColors.muted }}>
                  <span>Delivery Fee</span>
                  <span className="font-semibold" style={{ color: themeColors.text }}>
                    {pricing.deliveryFee === 0 ? 'FREE' : formatPrice(pricing.deliveryFee)}
                  </span>
                </div>

                <div className="flex justify-between text-base font-extrabold pt-2 border-t" style={{ borderColor: themeColors.border }}>
                  <span>Final Total</span>
                  <span style={{ color: themeColors.primary }}>{formatPrice(pricing.total)}</span>
                </div>
              </div>

              <button
                id="drawer-checkout-btn"
                onClick={handleCheckoutClick}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 hover:opacity-95"
                style={{ backgroundColor: themeColors.primary }}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
