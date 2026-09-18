import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Eye,
  AlertCircle,
  ExternalLink,
  Package,
  CreditCard,
  User,
  MapPin,
  X,
  FileText,
  History,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Order, OrderStatus, PaymentStatus, OrderEvent } from '../../types/store';
import { updateOrderStatus, updatePaymentStatus, getOrderEvents } from '../../services/store/storeService';

export const OrdersManager: React.FC = () => {
  const { orders, storeId, formatPrice, themeColors } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewingProof, setViewingProof] = useState<string | null>(null);
  const [orderEvents, setOrderEvents] = useState<OrderEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Load audit trail whenever selectedOrder changes
  React.useEffect(() => {
    if (selectedOrder) {
      setLoadingEvents(true);
      getOrderEvents(selectedOrder.id)
        .then(events => setOrderEvents(events))
        .catch(err => console.warn('Failed to load order events:', err))
        .finally(() => setLoadingEvents(false));
    } else {
      setOrderEvents([]);
    }
  }, [selectedOrder?.id]);

  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer?.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.transactionReference?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.orderStatus === statusFilter;
    const matchesPayment = paymentFilter === 'all' || o.paymentStatus === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatus(storeId, orderId, status);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, orderStatus: status });
      const events = await getOrderEvents(orderId);
      setOrderEvents(events);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, status: PaymentStatus) => {
    await updatePaymentStatus(storeId, orderId, status);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, paymentStatus: status });
      const events = await getOrderEvents(orderId);
      setOrderEvents(events);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'processing':
      case 'confirmed':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
    }
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'payment_submitted':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
      case 'pending_verification':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      case 'rejected':
      case 'refunded':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
      default:
        return 'bg-neutral-200 text-neutral-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: themeColors.text }}>
          Orders &amp; Fulfillment ({orders.length})
        </h2>
        <p className="text-xs" style={{ color: themeColors.muted }}>
          Track customer transactions, inspect payment proofs, and update order statuses.
        </p>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="relative sm:col-span-6">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by order #, customer, phone, or TID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border text-xs outline-none"
            style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface, color: themeColors.text }}
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
            style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface, color: themeColors.text }}
          >
            <option value="all">All Order Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
            style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface, color: themeColors.text }}
          >
            <option value="all">All Payment Statuses</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="payment_submitted">Proof Submitted</option>
            <option value="paid">Paid &amp; Approved</option>
            <option value="unpaid">Unpaid</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div
        className="rounded-2xl border overflow-hidden shadow-xs"
        style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b" style={{ borderColor: themeColors.border, backgroundColor: `${themeColors.primary}05` }}>
              <tr style={{ color: themeColors.muted }}>
                <th className="py-3 px-4 font-semibold">Order</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Total</th>
                <th className="py-3 px-4 font-semibold">Payment Method</th>
                <th className="py-3 px-4 font-semibold">Payment Status</th>
                <th className="py-3 px-4 font-semibold">Fulfillment</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center" style={{ color: themeColors.muted }}>
                    No orders found matching filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold" style={{ color: themeColors.primary }}>
                        #{order.orderNumber}
                      </span>
                      <p className="text-[10px] text-neutral-400">
                        {order.items?.length || 0} item(s)
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold truncate max-w-[140px]" style={{ color: themeColors.text }}>
                        {order.customer?.name}
                      </p>
                      <p className="text-[10px] text-neutral-400 font-mono">
                        {order.customer?.phone}
                      </p>
                    </td>

                    <td className="py-3 px-4 font-bold" style={{ color: themeColors.text }}>
                      {formatPrice(order.total)}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-[11px]" style={{ color: themeColors.text }}>
                        {order.paymentMethodName || 'Direct Payment'}
                      </span>
                      {order.transactionReference && (
                        <p className="text-[10px] font-mono text-emerald-600">
                          TID: {order.transactionReference}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getPaymentBadge(order.paymentStatus)}`}>
                        {order.paymentStatus.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${getStatusBadge(order.orderStatus)}`}>
                        {order.orderStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        className="px-3 py-1 rounded-lg border text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        style={{ borderColor: themeColors.border }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div
            className="w-full max-w-2xl rounded-2xl border shadow-2xl p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
          >
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: themeColors.border }}>
              <div>
                <span className="text-xs font-mono font-bold" style={{ color: themeColors.primary }}>
                  ORDER #{selectedOrder.orderNumber}
                </span>
                <h3 className="text-lg font-bold">Order Details &amp; Verification</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1 text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 pt-4 text-xs">
              {/* Status Update Quick Toggles */}
              <div className="p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
                <div>
                  <label className="block font-semibold mb-1">Payment Verification Status</label>
                  <select
                    value={selectedOrder.paymentStatus}
                    onChange={e => handleUpdatePaymentStatus(selectedOrder.id, e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-bold"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
                  >
                    <option value="pending_verification">Pending Verification</option>
                    <option value="payment_submitted">Proof Submitted</option>
                    <option value="paid">Approved &amp; Paid (✓)</option>
                    <option value="rejected">Rejected</option>
                    <option value="refunded">Refunded</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Fulfillment Order Status</label>
                  <select
                    value={selectedOrder.orderStatus}
                    onChange={e => handleUpdateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-bold capitalize"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Payment Proof Verification Card */}
              <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: themeColors.border }}>
                <h4 className="font-bold flex items-center gap-1.5" style={{ color: themeColors.text }}>
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>Payment Destination &amp; Proof</span>
                </h4>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: themeColors.border }}>
                  <span className="text-neutral-400">Destination Selected:</span>
                  <span className="font-bold">{selectedOrder.paymentMethodName}</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: themeColors.border }}>
                  <span className="text-neutral-400">Transaction ID (TID):</span>
                  <span className="font-mono font-bold text-indigo-600">
                    {selectedOrder.transactionReference || 'No TID provided'}
                  </span>
                </div>

                {selectedOrder.paymentProofUrl && (
                  <div className="pt-2">
                    <span className="block font-semibold text-neutral-400 mb-2">Attached Receipt Proof:</span>
                    <button
                      type="button"
                      onClick={() => setViewingProof(selectedOrder.paymentProofUrl || null)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      style={{ borderColor: themeColors.border }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Screenshot</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Customer & Shipping */}
              <div className="p-4 rounded-xl border space-y-1.5" style={{ borderColor: themeColors.border }}>
                <h4 className="font-bold flex items-center gap-1.5" style={{ color: themeColors.text }}>
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Customer &amp; Delivery Destination</span>
                </h4>
                <p><strong>Name:</strong> {selectedOrder.customer?.name}</p>
                <p><strong>Phone:</strong> {selectedOrder.customer?.phone}</p>
                <p><strong>Email:</strong> {selectedOrder.customer?.email || 'N/A'}</p>
                <p><strong>Address:</strong> {selectedOrder.customer?.address}, {selectedOrder.customer?.city}</p>
                {selectedOrder.customer?.notes && (
                  <p><strong>Notes:</strong> {selectedOrder.customer.notes}</p>
                )}
              </div>

              {/* Items List */}
              <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: themeColors.border }}>
                <h4 className="font-bold flex items-center gap-1.5" style={{ color: themeColors.text }}>
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>Order Items</span>
                </h4>
                <div className="divide-y" style={{ borderColor: themeColors.border }}>
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="font-bold">{item.productName}</p>
                        <p className="text-neutral-400">Qty: {item.quantity} {item.isFreeReward ? '• Complimentary Gift' : ''}</p>
                      </div>
                      <span className="font-bold" style={{ color: item.isFreeReward ? '#10b981' : themeColors.text }}>
                        {item.isFreeReward ? 'FREE' : formatPrice(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal:</span>
                    <span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount Total:</span>
                      <span>-{formatPrice(selectedOrder.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-400">
                    <span>Delivery Fee:</span>
                    <span>{formatPrice(selectedOrder.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm pt-1 border-t" style={{ borderColor: themeColors.border }}>
                    <span>Total:</span>
                    <span style={{ color: themeColors.primary }}>{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Order Lifecycle Audit Trail */}
              <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold flex items-center gap-1.5" style={{ color: themeColors.text }}>
                    <History className="w-4 h-4 text-emerald-600" />
                    <span>Audit Trail &amp; Lifecycle Events</span>
                  </h4>
                  <span className="text-[11px] px-2 py-0.5 rounded-md font-mono bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                    {orderEvents.length} {orderEvents.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                {loadingEvents ? (
                  <div className="py-4 text-center text-neutral-400 text-xs">
                    Loading lifecycle history...
                  </div>
                ) : orderEvents.length === 0 ? (
                  <div className="py-3 text-center text-neutral-400 text-xs italic">
                    No explicit state transition events recorded yet for this order.
                  </div>
                ) : (
                  <div className="relative pl-5 border-l-2 space-y-3" style={{ borderColor: themeColors.border }}>
                    {orderEvents.map((evt) => (
                      <div key={evt.id} className="relative group">
                        {/* Dot indicator */}
                        <div
                          className="absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 bg-white dark:bg-neutral-900"
                          style={{ borderColor: evt.eventType.includes('paid') ? '#10b981' : themeColors.primary }}
                        />
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-bold capitalize text-xs" style={{ color: themeColors.text }}>
                            {evt.eventType.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {new Date(evt.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                        {evt.notes && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {evt.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400">
                          <span className="uppercase px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-800 font-semibold text-[9px]">
                            Actor: {evt.actorType}
                          </span>
                          {evt.fromStatus && evt.toStatus && (
                            <span>
                              {evt.fromStatus} &rarr; <strong className="text-neutral-700 dark:text-neutral-300">{evt.toStatus}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for receipt screenshot */}
      {viewingProof && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          onClick={() => setViewingProof(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] bg-white dark:bg-neutral-900 rounded-2xl p-4 overflow-hidden">
            <button
              onClick={() => setViewingProof(null)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={viewingProof} alt="Payment Proof" className="w-full h-auto max-h-[75vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};
