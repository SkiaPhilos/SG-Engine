import React, { useState } from 'react';
import {
  Plus,
  CreditCard,
  Building2,
  Smartphone,
  Wallet,
  Edit2,
  Trash2,
  QrCode,
  Check,
  X,
  ShieldCheck,
  AlertCircle,
  Copy,
  Truck,
  Zap,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PaymentMethod, PaymentType } from '../../types/store';
import { savePaymentMethod, deletePaymentMethod } from '../../services/store/storeService';
import { ImageUpload } from '../common/ImageUpload';

export const PaymentsManager: React.FC = () => {
  const { paymentMethods, storeId, themeColors } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [currentMethod, setCurrentMethod] = useState<Partial<PaymentMethod> | null>(null);
  const [saving, setSaving] = useState(false);

  const manualMethods = paymentMethods.filter(m => m.type !== 'safepay');

  const availableTypes: { type: PaymentType; label: string; defaultName: string }[] = [
    { type: 'cod', label: 'Cash on Delivery (COD)', defaultName: 'Cash on Delivery (COD)' },
    { type: 'jazzcash', label: 'JazzCash Wallet', defaultName: 'JazzCash' },
    { type: 'easypaisa', label: 'Easypaisa Wallet', defaultName: 'Easypaisa' },
    { type: 'bank_transfer', label: 'Direct Bank Transfer', defaultName: 'Bank Transfer' },
    { type: 'raast', label: 'Raast Instant ID', defaultName: 'Raast Direct' },
    { type: 'nayapay', label: 'NayaPay Wallet', defaultName: 'NayaPay' },
    { type: 'custom_transfer', label: 'Custom Destination', defaultName: 'Direct Payment' },
  ];

  const handleOpenAdd = (selectedType: PaymentType = 'jazzcash') => {
    const matched = availableTypes.find(t => t.type === selectedType);
    setCurrentMethod({
      type: selectedType,
      displayName: matched?.defaultName || (selectedType === 'cod' ? 'Cash on Delivery (COD)' : 'Direct Payment'),
      accountTitle: selectedType === 'cod' ? 'Cash on Delivery' : '',
      accountNumber: selectedType === 'cod' ? 'Doorstep Cash Collection' : '',
      iban: '',
      bankName: selectedType === 'bank_transfer' ? 'Meezan Bank' : '',
      instructions: selectedType === 'cod'
        ? 'Pay cash directly to the courier delivery rider when your parcel arrives at your doorstep. Please keep exact cash ready.'
        : 'Transfer funds to account above. Submit screenshot or TID for order confirmation.',
      qrCodeUrl: '',
      enabled: true,
      requireScreenshot: selectedType !== 'cod',
      requireTransactionReference: selectedType !== 'cod',
    });
    setIsEditing(true);
  };

  const handleEdit = (m: PaymentMethod) => {
    setCurrentMethod({ ...m });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment destination?')) {
      await deletePaymentMethod(storeId, id);
    }
  };

  const handleToggleEnabled = async (m: PaymentMethod) => {
    await savePaymentMethod(storeId, {
      ...m,
      enabled: !m.enabled,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMethod?.displayName?.trim()) return;
    setSaving(true);
    try {
      await savePaymentMethod(storeId, currentMethod as any);
      setIsEditing(false);
      setCurrentMethod(null);
    } catch (e) {
      console.error(e);
      alert('Error saving payment destination');
    } finally {
      setSaving(false);
    }
  };

  const getMethodIcon = (type: PaymentType) => {
    switch (type) {
      case 'cod':
        return <Truck className="w-4 h-4 text-emerald-600" />;
      case 'safepay':
        return <Zap className="w-4 h-4 text-indigo-600" />;
      case 'jazzcash':
      case 'easypaisa':
      case 'nayapay':
        return <Smartphone className="w-4 h-4 text-emerald-600" />;
      case 'bank_transfer':
      case 'raast':
        return <Building2 className="w-4 h-4 text-indigo-600" />;
      default:
        return <Wallet className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: themeColors.text }}>
            Payment Destinations ({manualMethods.length})
          </h2>
          <p className="text-xs" style={{ color: themeColors.muted }}>
            Manage Cash on Delivery (COD) and manual advance payment channels (JazzCash, Easypaisa, Bank Transfer, Raast).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="add-payment-btn"
            onClick={() => handleOpenAdd('jazzcash')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all active:scale-95 cursor-pointer"
            style={{ backgroundColor: themeColors.primary }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Destination</span>
          </button>
        </div>
      </div>

      {/* Payment Types Guidance Banner */}
      <div
        className="p-4 rounded-2xl border text-xs grid grid-cols-1 md:grid-cols-3 gap-3"
        style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
      >
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
            <Truck className="w-4 h-4" />
            <span>Cash on Delivery (70%)</span>
          </div>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Over 70% of Pakistani shoppers choose COD. Physical cash is collected at the customer's doorstep upon parcel delivery.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold">
            <Zap className="w-4 h-4" />
            <span>Pay Live Online</span>
          </div>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Live debit/credit card and wallet checkout. Orders are verified and automatically confirmed via secure live session.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold">
            <Building2 className="w-4 h-4" />
            <span>Pay in Advance (Manual)</span>
          </div>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Customers transfer in advance to your JazzCash, Easypaisa, or Bank IBAN, attach proof of payment, and await manual verification.
          </p>
        </div>
      </div>

      {/* Quick Add Presets Row */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-neutral-400">Quick add:</span>
        {availableTypes.map(t => (
          <button
            key={t.type}
            onClick={() => handleOpenAdd(t.type)}
            className="px-3 py-1 rounded-lg border text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
            style={{ borderColor: themeColors.border, color: themeColors.text }}
          >
            {getMethodIcon(t.type)}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Payment Destinations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {manualMethods.length === 0 ? (
          <div className="col-span-2 p-8 text-center rounded-2xl border" style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}>
            <Wallet className="w-12 h-12 mx-auto mb-2 opacity-30 text-indigo-600" />
            <p className="font-bold text-sm">No payment destinations configured</p>
            <p className="text-xs mt-1" style={{ color: themeColors.muted }}>
              Configure at least one destination so customers can send direct mobile or bank payments.
            </p>
          </div>
        ) : (
          manualMethods.map(m => (
            <div
              key={m.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                !m.enabled ? 'opacity-60 bg-neutral-100 dark:bg-neutral-900' : ''
              }`}
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.surface,
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                      {getMethodIcon(m.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: themeColors.text }}>
                        {m.displayName}
                      </h3>
                      <span className="text-[10px] uppercase font-mono text-neutral-400">
                        {m.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Enabled badge / toggle */}
                  <button
                    onClick={() => handleToggleEnabled(m)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                      m.enabled
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {m.enabled ? 'Active on Checkout' : 'Disabled'}
                  </button>
                </div>

                {/* Details list */}
                <div className="space-y-1 text-xs py-2 border-y" style={{ borderColor: themeColors.border }}>
                  {m.accountTitle && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Title:</span>
                      <span className="font-semibold">{m.accountTitle}</span>
                    </div>
                  )}
                  {m.accountNumber && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Account:</span>
                      <span className="font-mono font-bold">{m.accountNumber}</span>
                    </div>
                  )}
                  {m.iban && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">IBAN:</span>
                      <span className="font-mono text-[11px] font-bold">{m.iban}</span>
                    </div>
                  )}
                  {m.bankName && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Bank:</span>
                      <span className="font-semibold">{m.bankName}</span>
                    </div>
                  )}
                </div>

                {/* Requirements */}
                <div className="flex flex-wrap gap-2 text-[10px] font-medium pt-2 text-neutral-500">
                  {m.requireScreenshot && <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">Screenshot enabled</span>}
                  {m.requireTransactionReference && <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">TID required</span>}
                  {m.qrCodeUrl && <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md flex items-center gap-1"><QrCode className="w-3 h-3" /> QR Attached</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 mt-2">
                <button
                  onClick={() => handleEdit(m)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-indigo-600 transition-colors"
                  title="Edit details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-red-600 transition-colors"
                  title="Delete destination"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Modal */}
      {isEditing && currentMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 my-8 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: themeColors.border }}>
              <h3 className="text-base font-bold">
                {currentMethod.id ? 'Edit Payment Destination' : 'Add Payment Destination'}
              </h3>
              <button onClick={() => setIsEditing(false)} className="p-1 text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Destination Type</label>
                <select
                  value={currentMethod.type || 'jazzcash'}
                  onChange={e => setCurrentMethod({ ...currentMethod, type: e.target.value as PaymentType })}
                  className="w-full px-3 py-2 rounded-xl border text-xs"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                >
                  {availableTypes.map(t => (
                    <option key={t.type} value={t.type}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Customer Label (Display Name) *</label>
                <input
                  type="text"
                  required
                  value={currentMethod.displayName || ''}
                  onChange={e => setCurrentMethod({ ...currentMethod, displayName: e.target.value })}
                  placeholder="e.g. JazzCash, Meezan Bank Transfer, Easypaisa, Raast"
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>

              {currentMethod.type === 'cod' ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-3">
                  <Truck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Cash on Delivery (COD) Selected</p>
                    <p className="text-[11px] mt-1 leading-relaxed opacity-90">
                      No bank accounts, IBANs, or receipts are required. Customers pay physical cash to the delivery rider when receiving the package.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Account Title / Beneficiary</label>
                      <input
                        type="text"
                        value={currentMethod.accountTitle || ''}
                        onChange={e => setCurrentMethod({ ...currentMethod, accountTitle: e.target.value })}
                        placeholder="e.g. Store Owner / Silk & Stone"
                        className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                        style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Account / Mobile Number</label>
                      <input
                        type="text"
                        value={currentMethod.accountNumber || ''}
                        onChange={e => setCurrentMethod({ ...currentMethod, accountNumber: e.target.value })}
                        placeholder="03001234567"
                        className="w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none"
                        style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">IBAN / Raast ID (Optional)</label>
                      <input
                        type="text"
                        value={currentMethod.iban || ''}
                        onChange={e => setCurrentMethod({ ...currentMethod, iban: e.target.value })}
                        placeholder="PK36MEZN0000000..."
                        className="w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none"
                        style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Bank Name (For Bank Transfers)</label>
                      <input
                        type="text"
                        value={currentMethod.bankName || ''}
                        onChange={e => setCurrentMethod({ ...currentMethod, bankName: e.target.value })}
                        placeholder="e.g. Meezan Bank, HBL, Bank Alfalah"
                        className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                        style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                      />
                    </div>
                  </div>

                  <div>
                    <ImageUpload
                      value={currentMethod.qrCodeUrl || ''}
                      onChange={url => setCurrentMethod({ ...currentMethod, qrCodeUrl: url })}
                      label="QR Code Image (Optional)"
                      helperText="Upload your bank/wallet QR code image for instant customer scanning"
                      aspectRatio="square"
                      maxDimension={600}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold mb-1">Payment Instructions to Customer</label>
                <textarea
                  rows={2}
                  value={currentMethod.instructions || ''}
                  onChange={e => setCurrentMethod({ ...currentMethod, instructions: e.target.value })}
                  placeholder="Instructions displayed on checkout when this option is selected"
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-none resize-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>

              <div className="space-y-2 pt-2 border-t" style={{ borderColor: themeColors.border }}>
                {currentMethod.type !== 'cod' && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="require-tid"
                        checked={Boolean(currentMethod.requireTransactionReference)}
                        onChange={e => setCurrentMethod({ ...currentMethod, requireTransactionReference: e.target.checked })}
                      />
                      <label htmlFor="require-tid" className="font-semibold cursor-pointer">
                        Require Customer to enter Transaction ID / TID
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="require-proof"
                        checked={Boolean(currentMethod.requireScreenshot)}
                        onChange={e => setCurrentMethod({ ...currentMethod, requireScreenshot: e.target.checked })}
                      />
                      <label htmlFor="require-proof" className="font-semibold cursor-pointer">
                        Prompt Customer for Payment Receipt Screenshot
                      </label>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-enabled"
                    checked={currentMethod.enabled !== false}
                    onChange={e => setCurrentMethod({ ...currentMethod, enabled: e.target.checked })}
                  />
                  <label htmlFor="is-enabled" className="font-semibold cursor-pointer">
                    Active &amp; Visible at Checkout
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: themeColors.border }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border font-semibold"
                  style={{ borderColor: themeColors.border }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl font-bold text-white shadow-xs"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  {saving ? 'Saving...' : 'Save Destination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
