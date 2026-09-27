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
  Check,
  ArrowRight,
  RotateCcw,
  Ban,
  ChevronDown,
  Sparkles,
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
  const [isUpdating, setIsUpdating] = useState(false);

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
    setIsUpdating(true);
    try {
      await updateOrderStatus(storeId, orderId, status);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, orderStatus: status });
        const events = await getOrderEvents(orderId);
        setOrderEvents(events);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, status: PaymentStatus) => {
    setIsUpdating(true);
    try {
      await updatePaymentStatus(storeId, orderId, status);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, paymentStatus: status });
        const events = await getOrderEvents(orderId);
        setOrderEvents(events);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Authoritative State Machine Transitions
  const handleApprovePaymentAndConfirm = async (order: Order) => {
    setIsUpdating(true);
    try {
      await updatePaymentStatus(storeId, order.id, 'paid');
      await updateOrderStatus(storeId, order.id, 'confirmed');
      setSelectedOrder({ ...order, paymentStatus: 'paid', orderStatus: 'confirmed' });
      const events = await getOrderEvents(order.id);
      setOrderEvents(events);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmCodOrder = async (order: Order) => {
    setIsUpdating(true);
    try {
      await updateOrderStatus(storeId, order.id, 'confirmed');
      setSelectedOrder({ ...order, orderStatus: 'confirmed' });
      const events = await getOrderEvents(order.id);
      setOrderEvents(events);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectPayment = async (order: Order) => {
    const reason = window.prompt('Enter reason for payment rejection (optional, e.g. TID not found in bank statement):');
    if (reason === null) return;
    setIsUpdating(true);
    try {
      await updatePaymentStatus(storeId, order.id, 'rejected');
      setSelectedOrder({ ...order, paymentStatus: 'rejected' });
      const events = await getOrderEvents(order.id);
      setOrderEvents(events);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAdvanceOrderStatus = async (order: Order, nextStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      const isCod = order.paymentMethodId === 'cod' || (order.paymentMethodName || '').toLowerCase().includes('cash on delivery');
      if (nextStatus === 'delivered' && isCod && order.paymentStatus !== 'paid') {
        await updatePaymentStatus(storeId, order.id, 'paid');
      }
      await updateOrderStatus(storeId, order.id, nextStatus);
      setSelectedOrder({
        ...order,
        orderStatus: nextStatus,
        paymentStatus: (nextStatus === 'delivered' && isCod) ? 'paid' : order.paymentStatus,
      });
      const events = await getOrderEvents(order.id);
      setOrderEvents(events);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async (order: Order) => {
    if (!window.confirm(`Are you sure you want to cancel Order #${order.orderNumber}?`)) return;
    setIsUpdating(true);
    try {
      await updateOrderStatus(storeId, order.id, 'cancelled');
      setSelectedOrder({ ...order, orderStatus: 'cancelled' });
      const events = await getOrderEvents(order.id);
      setOrderEvents(events);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReopenOrder = async (order: Order) => {
    if (!window.confirm(`Reopen Order #${order.orderNumber} back to Pending?`)) return;
    setIsUpdating(true);
    try {
      await updateOrderStatus(storeId, order.id, 'pending');
      setSelectedOrder({ ...order, orderStatus: 'pending' });
      const events = await getOrderEvents(order.id);
      setOrderEvents(events);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStepBackOrderStatus = async (order: Order, prevStatus: OrderStatus) => {
    if (!window.confirm(`Revert order fulfillment from "${order.orderStatus}" back to "${prevStatus}"?`)) return;
    setIsUpdating(true);
    try {
      await updateOrderStatus(storeId, order.id, prevStatus);
      setSelectedOrder({ ...order, orderStatus: prevStatus });
      const events = await getOrderEvents(order.id);
      setOrderEvents(events);
    } finally {
      setIsUpdating(false);
    }
  };

  const getPipelineIndex = (order: Order): number => {
    switch (order.orderStatus) {
      case 'cancelled':
        return -1;
      case 'delivered':
        return 4;
      case 'shipped':
        return 3;
      case 'processing':
        return 2;
      case 'confirmed':
        return 1;
      case 'pending':
      default:
        return 0;
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
              {/* 1. Authoritative Visual Lifecycle Stepper */}
              <div
                className="p-5 rounded-2xl border space-y-4"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-neutral-500">
                    Fulfillment Pipeline
                  </span>
                  {selectedOrder.orderStatus === 'cancelled' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                      Cancelled
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 capitalize">
                      Current Stage: {selectedOrder.orderStatus}
                    </span>
                  )}
                </div>

                {/* Progress Pipeline Stepper */}
                <div className="relative pt-2 pb-1">
                  <div className="flex items-center justify-between relative z-10">
                    {[
                      { index: 0, label: 'Placed' },
                      { index: 1, label: 'Confirmed' },
                      { index: 2, label: 'Processing' },
                      { index: 3, label: 'Shipped' },
                      { index: 4, label: 'Delivered' },
                    ].map(step => {
                      const currentPipeline = getPipelineIndex(selectedOrder);
                      const isCompleted = currentPipeline > step.index;
                      const isCurrent = currentPipeline === step.index;
                      const isCancelled = selectedOrder.orderStatus === 'cancelled';

                      return (
                        <div key={step.index} className="flex flex-col items-center flex-1">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] transition-all shadow-xs ${
                              isCancelled
                                ? 'bg-neutral-200 text-neutral-400 dark:bg-neutral-800'
                                : isCompleted
                                ? 'bg-emerald-600 text-white'
                                : isCurrent
                                ? 'ring-3 ring-blue-500 bg-blue-600 text-white scale-110'
                                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                            }`}
                          >
                            {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.index + 1}
                          </div>
                          <span
                            className={`text-[10px] mt-1.5 font-semibold text-center ${
                              isCurrent
                                ? 'text-blue-600 dark:text-blue-400 font-bold'
                                : isCompleted
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-neutral-400'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Context-Aware Guided Action Card */}
                <div
                  className="p-4 rounded-xl border space-y-3"
                  style={{
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.border,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: themeColors.text }}>
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Next Operational Action</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getPaymentBadge(selectedOrder.paymentStatus)}`}>
                        Payment: {selectedOrder.paymentStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Flow Action Scenarios */}
                  {selectedOrder.orderStatus === 'cancelled' ? (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-200 space-y-2">
                      <p className="font-semibold text-xs flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>Order is Cancelled</span>
                      </p>
                      <p className="text-[11px] opacity-90">
                        This order was cancelled and inventory reservations were returned to stock.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleReopenOrder(selectedOrder)}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reopen Order</span>
                      </button>
                    </div>
                  ) : selectedOrder.orderStatus === 'delivered' ? (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-xs font-semibold">
                        Order fully completed and delivered to customer. No further action needed.
                      </span>
                    </div>
                  ) : selectedOrder.orderStatus === 'pending' ? (
                    /* Stage 0: Placed / Verification Required */
                    <div className="space-y-3">
                      {selectedOrder.paymentStatus === 'paid' ? (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                          <p className="text-[11px] text-emerald-900 dark:text-emerald-100">
                            <strong>Payment Verified (Paid):</strong> Payment has been successfully verified via {selectedOrder.paymentMethodName || 'online gateway'}. Confirm this order to advance to packaging.
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleAdvanceOrderStatus(selectedOrder, 'confirmed')}
                              disabled={isUpdating}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Confirm Order for Packaging</span>
                            </button>
                          </div>
                        </div>
                      ) : selectedOrder.paymentMethodId === 'cod' || (selectedOrder.paymentMethodName || '').toLowerCase().includes('cash on delivery') ? (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                          <p className="text-[11px] text-emerald-900 dark:text-emerald-100">
                            <strong>Cash on Delivery (COD) Order:</strong> Customer will pay upon delivery. Confirm the delivery address and contact phone number, then advance the order for packaging.
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleConfirmCodOrder(selectedOrder)}
                              disabled={isUpdating}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Confirm Order for Packaging</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                          <p className="text-[11px] text-amber-900 dark:text-amber-100">
                            <strong>Manual Payment Verification:</strong> Customer submitted an advance transfer. Review the Transaction Reference (TID) and payment proof screenshot below before approving.
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleApprovePaymentAndConfirm(selectedOrder)}
                              disabled={isUpdating}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Approve Payment &amp; Confirm Order</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectPayment(selectedOrder)}
                              disabled={isUpdating}
                              className="px-3 py-2 rounded-xl border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-semibold text-xs hover:bg-red-100 transition-all cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject Payment</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : selectedOrder.orderStatus === 'confirmed' ? (
                    /* Stage 1: Confirmed -> Pack Items */
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-2">
                      <p className="text-[11px] text-blue-900 dark:text-blue-100">
                        <strong>Order Confirmed:</strong> Payment has been verified (or COD approved). Proceed to pick the {selectedOrder.items?.length || 0} ordered item(s) from inventory and prepare parcel packaging.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAdvanceOrderStatus(selectedOrder, 'processing')}
                          disabled={isUpdating}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Start Packaging (Mark Processing)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepBackOrderStatus(selectedOrder, 'pending')}
                          disabled={isUpdating}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          Revert to Placed
                        </button>
                      </div>
                    </div>
                  ) : selectedOrder.orderStatus === 'processing' ? (
                    /* Stage 2: Processing -> Hand Over to Courier */
                    <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                      <p className="text-[11px] text-indigo-900 dark:text-indigo-100">
                        <strong>Packaging Complete:</strong> Parcel is boxed and labeled. Hand over parcel to delivery courier or dispatch rider.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAdvanceOrderStatus(selectedOrder, 'shipped')}
                          disabled={isUpdating}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Dispatch &amp; Mark as Shipped</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepBackOrderStatus(selectedOrder, 'confirmed')}
                          disabled={isUpdating}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          Revert to Confirmed
                        </button>
                      </div>
                    </div>
                  ) : selectedOrder.orderStatus === 'shipped' ? (
                    /* Stage 3: Shipped -> Mark Delivered */
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-2">
                      <p className="text-[11px] text-purple-900 dark:text-purple-100">
                        <strong>Order In Transit:</strong> Courier is delivering parcel to customer destination. Once the courier confirms delivery, mark as delivered.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAdvanceOrderStatus(selectedOrder, 'delivered')}
                          disabled={isUpdating}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Order as Delivered (Complete)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepBackOrderStatus(selectedOrder, 'processing')}
                          disabled={isUpdating}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          Revert to Processing
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Cancel Action (Available if not delivered and not cancelled) */}
                  {selectedOrder.orderStatus !== 'delivered' && selectedOrder.orderStatus !== 'cancelled' && (
                    <div className="pt-2 border-t flex justify-end" style={{ borderColor: themeColors.border }}>
                      <button
                        type="button"
                        onClick={() => handleCancelOrder(selectedOrder)}
                        disabled={isUpdating}
                        className="text-[11px] text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Ban className="w-3 h-3" />
                        <span>Cancel Order</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Controlled Order Adjustments (Replacing Freeform Selects) */}
                <details className="text-[11px] group">
                  <summary className="font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer flex items-center justify-between py-1">
                    <span>Payment &amp; Administrative Actions</span>
                    <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pt-3 border-t mt-2 space-y-3" style={{ borderColor: themeColors.border }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-neutral-400 mr-1">Payment Actions:</span>
                      {selectedOrder.paymentStatus !== 'paid' && (
                        <button
                          type="button"
                          onClick={() => handleUpdatePaymentStatus(selectedOrder.id, 'paid')}
                          disabled={isUpdating}
                          className="px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-100 transition-colors"
                        >
                          ✓ Mark Payment Paid
                        </button>
                      )}
                      {selectedOrder.paymentStatus !== 'rejected' && selectedOrder.paymentStatus !== 'paid' && (
                        <button
                          type="button"
                          onClick={() => handleUpdatePaymentStatus(selectedOrder.id, 'rejected')}
                          disabled={isUpdating}
                          className="px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 font-semibold hover:bg-red-100 transition-colors"
                        >
                          ✗ Mark Payment Rejected
                        </button>
                      )}
                      {selectedOrder.paymentStatus === 'paid' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Mark payment as refunded for Order #${selectedOrder.orderNumber}?`)) {
                              handleUpdatePaymentStatus(selectedOrder.id, 'refunded');
                            }
                          }}
                          disabled={isUpdating}
                          className="px-2.5 py-1 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 font-semibold hover:bg-purple-100 transition-colors"
                        >
                          ↺ Mark as Refunded
                        </button>
                      )}
                    </div>
                  </div>
                </details>
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
