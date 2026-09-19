import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Key,
  Webhook,
  Check,
  Copy,
  AlertCircle,
  AlertTriangle,
  Save,
  RotateCw,
  Eye,
  EyeOff,
  Radio,
  ExternalLink,
  Lock,
  Server,
  RefreshCw,
  CreditCard,
  Trash2,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  getSafepayStatus,
  configureSafepay,
  testSafepayConnection,
  clearSafepayCredentials,
  SafepayStatusResponse,
} from '../../services/safepay/safepayClient';

export const SafepayGatewayManager: React.FC = () => {
  const { storeId, themeColors } = useStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2500);
  };

  // Form State (write-only for secrets)
  const [enabled, setEnabled] = useState(false);
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [webhookSecretInput, setWebhookSecretInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(true);
  const [showSecretKey, setShowSecretKey] = useState(true);
  const [showWebhookSecret, setShowWebhookSecret] = useState(true);

  // Masked Status from Server
  const [status, setStatus] = useState<SafepayStatusResponse | null>(null);

  const loadStatus = async () => {
    try {
      const data = await getSafepayStatus(storeId);
      setStatus(data);
      setEnabled(data.enabled);
      setEnvironment(data.environment);
    } catch (err) {
      console.error('Failed to load Safepay status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [storeId]);

  const handleCopyWebhook = () => {
    const url = status?.webhookUrl || `${window.location.origin}/api/safepay/webhook`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleClearVault = async () => {
    if (!window.confirm('Clear all stored Safepay credentials? This will reset the encrypted vault and allow you to enter fresh keys.')) {
      return;
    }
    setClearing(true);
    setSaveError(null);
    setTestResult(null);
    try {
      const updatedStatus = await clearSafepayCredentials(storeId);
      setStatus(updatedStatus);
      setApiKeyInput('');
      setSecretKeyInput('');
      setWebhookSecretInput('');
      setEnabled(false);
      setTestResult({
        success: true,
        message: '✓ Stored credentials cleared from the vault. You can now enter fresh keys below.',
      });
    } catch (err: any) {
      setSaveError(err.message || 'Failed to clear credentials');
    } finally {
      setClearing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setSaveError(null);
    setTestResult(null);

    if (apiKeyInput.includes('•') || secretKeyInput.includes('•') || webhookSecretInput.includes('•')) {
      setSaveError('Please do not submit placeholder bullets (•). Paste your actual key strings starting with sec_ or pub_ from your Safepay dashboard.');
      setSaving(false);
      return;
    }

    try {
      const updatedStatus = await configureSafepay({
        storeId,
        apiKey: apiKeyInput.trim() ? apiKeyInput.trim() : undefined,
        secretKey: secretKeyInput.trim() ? secretKeyInput.trim() : undefined,
        webhookSecret: webhookSecretInput.trim() ? webhookSecretInput.trim() : undefined,
        environment,
        enabled,
      });

      setStatus(updatedStatus);
      setApiKeyInput('');
      setSecretKeyInput('');
      setWebhookSecretInput('');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update gateway configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSafepayConnection(storeId, {
        apiKey: apiKeyInput.trim() || undefined,
        secretKey: secretKeyInput.trim() || undefined,
        environment,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to reach backend connection test',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isConfigured = status?.hasApiKey && status?.hasWebhookSecret;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight" style={{ color: themeColors.text }}>
              Safepay Automated Gateway
            </h2>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                status?.enabled
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20'
              }`}
            >
              {status?.enabled ? `Active (${status.environment})` : 'Disabled'}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: themeColors.muted }}>
            Instant online checkout with credit/debit cards and digital wallets. Coexists alongside manual payment destinations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(status?.hasApiKey || status?.hasSecretKey || status?.hasWebhookSecret) && (
            <button
              type="button"
              onClick={handleClearVault}
              disabled={clearing}
              title="Clear all stored Safepay credentials to start fresh"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            >
              {clearing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Clear Stored Keys</span>
            </button>
          )}
          <button
            type="button"
            onClick={loadStatus}
            title="Refresh Status"
            className="p-2 rounded-xl border hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            style={{ borderColor: themeColors.border, color: themeColors.text }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Security Architectural Notice */}
      <div
        className="p-4 rounded-2xl border flex items-start gap-3 text-xs"
        style={{
          borderColor: `${themeColors.primary}30`,
          backgroundColor: `${themeColors.primary}08`,
          color: themeColors.text,
        }}
      >
        <Lock className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Zero-Exposure Server Architecture (ADR 010)</p>
          <p style={{ color: themeColors.muted }}>
            Safepay API credentials and webhook secrets are encrypted at rest with AES-256-GCM on the server. Plaintext credentials are never delivered to the customer storefront or browser. Webhooks are cryptographically validated via HMAC-SHA256 before marking payments paid.
          </p>
        </div>
      </div>

      {/* Vault Diagnostic Warning (if decryption error) */}
      {(status?.vault || status?.secretManager) &&
        (status?.vault?.status === 'error' || status?.secretManager?.status === 'error') && (
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Credential Notice</span>
            </div>
            <p className="leading-relaxed">
              {status.vault?.message || status.secretManager?.message}
            </p>
          </div>
        )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Main Settings Card */}
        <div
          className="p-6 rounded-2xl border shadow-xs space-y-5"
          style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}
        >
          {/* Gateway Activation Toggle */}
          <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: themeColors.border }}>
            <div>
              <p className="text-sm font-bold" style={{ color: themeColors.text }}>
                Enable Safepay Checkout
              </p>
              <p className="text-xs" style={{ color: themeColors.muted }}>
                Show Safepay instant checkout option to customers on checkout.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Environment Mode Selector */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: themeColors.text }}>
              Operational Environment
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEnvironment('sandbox')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  environment === 'sandbox' ? 'ring-2' : 'hover:border-neutral-400'
                }`}
                style={{
                  borderColor: environment === 'sandbox' ? themeColors.primary : themeColors.border,
                  backgroundColor: environment === 'sandbox' ? `${themeColors.primary}08` : themeColors.background,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold" style={{ color: themeColors.text }}>
                    Sandbox Mode (Test)
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    TEST
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: themeColors.muted }}>
                  Connects to sandbox.api.getsafepay.com for testing simulated payments.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setEnvironment('production')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  environment === 'production' ? 'ring-2' : 'hover:border-neutral-400'
                }`}
                style={{
                  borderColor: environment === 'production' ? themeColors.primary : themeColors.border,
                  backgroundColor: environment === 'production' ? `${themeColors.primary}08` : themeColors.background,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold" style={{ color: themeColors.text }}>
                    Production Mode (Live)
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    LIVE
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: themeColors.muted }}>
                  Connects to api.getsafepay.com for real monetary transactions in PKR.
                </p>
              </button>
            </div>
          </div>

          {/* Webhook Endpoint URL & Webhooks v2 Details */}
          <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-bold" style={{ color: themeColors.text }}>Safepay Webhook Endpoint</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Webhooks v2 & Payments 2.0
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                style={{ borderColor: themeColors.border, color: themeColors.text }}
              >
                {copiedWebhook ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedWebhook ? 'Copied!' : 'Copy Webhook URL'}</span>
              </button>
            </div>

            <p className="font-mono text-xs break-all py-1.5 px-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800" style={{ color: themeColors.text }}>
              {status?.webhookUrl || `${window.location.origin}/api/safepay/webhook`}
            </p>
            <div className="space-y-1 text-[11px]" style={{ color: themeColors.muted }}>
              <p>
                Paste this URL into your Safepay Merchant Dashboard under <strong>Developer &gt; Webhooks</strong>.
              </p>
              <p className="leading-relaxed">
                Transactions automatically appear in your Safepay Dashboard under <strong>Payments &gt; Payments 2.0</strong> with rich customer profiles and order metadata. Webhooks are cryptographically authenticated via HMAC-SHA256 (<code className="font-mono">X-SFPY-SIGNATURE</code>, <code className="font-mono">X-SFPY-TIMESTAMP</code>), with duplicate prevention powered by <code className="font-mono">X-SFPY-EVENT-ID</code>.
              </p>
            </div>
          </div>

          {/* Sandbox Test Cards & 3DS Emulator Helper (Visible in Sandbox mode) */}
          {environment === 'sandbox' && (
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    Safepay Sandbox Test Cards
                  </span>
                </div>
                <a
                  href="https://safepay-docs.netlify.app/developers/safepay/test-cards/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <span>Test Cards Docs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Use these official Safepay test credentials during sandbox checkout to test 3DS authentication and payment webhooks:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Mastercard Success */}
                <div className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Mastercard (Success)</span>
                    <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">5200 0000 0000 1096</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText('5200000000001096', 'mc')}
                    className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                    title="Copy Card Number"
                  >
                    {copiedItem === 'mc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Visa Success */}
                <div className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Visa (Success)</span>
                    <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">4000 0000 0000 0002</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText('4000000000000002', 'visa')}
                    className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                    title="Copy Card Number"
                  >
                    {copiedItem === 'visa' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">Expiry:</span>
                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">Any future (e.g. 12/28)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">CVV:</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText('111', 'cvv')}
                    className="font-mono font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded inline-flex items-center gap-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  >
                    <span>111</span>
                    {copiedItem === 'cvv' ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5 text-neutral-400" />}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">3DS OTP Emulator:</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText('123456', 'otp')}
                    className="font-mono font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded inline-flex items-center gap-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  >
                    <span>123456</span>
                    {copiedItem === 'otp' ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5 text-neutral-400" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Which Keys to Enter Visual Guide */}
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
              <Key className="w-4 h-4 text-blue-600" />
              <span>Safepay Key Mapping Guide (3 Simple Fields)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              {/* 1. Public Key */}
              <div className="p-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-[12px]">
                  <Check className="w-3.5 h-3.5" />
                  <span>1. Public Key</span>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  From Safepay &gt; <strong>Developer &gt; APIs &gt; Public Key</strong>. Starts with <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px]">sec_...</code> (Sandbox) or <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px]">pub_...</code> (Live). Used to initiate customer checkout sessions.
                </p>
              </div>

              {/* 2. Secret Key */}
              <div className="p-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400 text-[12px]">
                  <Check className="w-3.5 h-3.5" />
                  <span>2. Secret Key</span>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  From Safepay &gt; <strong>Developer &gt; APIs &gt; Secret Key</strong>. Private merchant key for backend server token creation (<code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px]">X-SFPY-MERCHANT-SECRET</code>).
                </p>
              </div>

              {/* 3. Webhook Secret */}
              <div className="p-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 text-[12px]">
                  <Check className="w-3.5 h-3.5" />
                  <span>3. Webhook Secret</span>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  From Safepay &gt; <strong>Developer &gt; Endpoints &gt; Shared Secret</strong>. Used to cryptographically verify <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px]">X-SFPY-SIGNATURE</code> when orders are paid.
                </p>
              </div>
            </div>
          </div>

          {/* 1. Public Key (API Key) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold" style={{ color: themeColors.text }}>
                Safepay Public Key (from Developer &gt; APIs)
              </label>
              {status?.hasApiKey && (
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Saved: {status.maskedApiKey}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder={status?.hasApiKey ? 'Enter new Public Key to replace existing' : 'e.g. sec_... (from Developer > APIs > Public Key)'}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all pr-10 focus:ring-2"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px]" style={{ color: themeColors.muted }}>
              Copy the <strong>Public Key</strong> from Safepay Dashboard &gt; Developer &gt; APIs.
            </p>
            {apiKeyInput.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] pt-0.5">
                {apiKeyInput.includes('•') ? (
                  <span className="text-red-500 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Placeholder bullets detected. Please paste your actual Public Key from Safepay.
                  </span>
                ) : apiKeyInput.startsWith('sec_') || apiKeyInput.startsWith('pub_') ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Recognized Safepay key format ({apiKeyInput.length} chars)
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Format note: Safepay Public Keys usually start with sec_ or pub_.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 2. Secret Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold" style={{ color: themeColors.text }}>
                Safepay Secret Key (from Developer &gt; APIs)
              </label>
              {status?.hasSecretKey && (
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Saved: {status.maskedSecretKey}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showSecretKey ? 'text' : 'password'}
                value={secretKeyInput}
                onChange={e => setSecretKeyInput(e.target.value)}
                placeholder={status?.hasSecretKey ? 'Enter new Secret Key to replace existing' : 'e.g. sec_... (from Developer > APIs > Secret Key)'}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all pr-10 focus:ring-2"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px]" style={{ color: themeColors.muted }}>
              Copy the <strong>Secret Key</strong> from Safepay Dashboard &gt; Developer &gt; APIs.
            </p>
            {secretKeyInput.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] pt-0.5">
                {secretKeyInput.includes('•') ? (
                  <span className="text-red-500 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Placeholder bullets detected. Please paste your actual Secret Key from Safepay.
                  </span>
                ) : secretKeyInput.startsWith('sec_') ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Recognized Safepay Secret Key format ({secretKeyInput.length} chars)
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Format note: Safepay Secret Keys usually start with sec_.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 3. Webhook Secret (Write-Only) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold" style={{ color: themeColors.text }}>
                Safepay Shared Webhook Secret (from Developer &gt; Endpoints)
              </label>
              {status?.hasWebhookSecret && (
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Saved: ••••••••••••••••
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                value={webhookSecretInput}
                onChange={e => setWebhookSecretInput(e.target.value)}
                placeholder={status?.hasWebhookSecret ? 'Enter new Shared Secret to replace existing' : 'e.g. whsec_... (from Developer > Endpoints)'}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all pr-10 focus:ring-2"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px]" style={{ color: themeColors.muted }}>
              Copy the <strong>Shared Webhook Secret</strong> from Safepay Dashboard &gt; Developer &gt; Endpoints (Webhooks).
            </p>
            {webhookSecretInput.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] pt-0.5">
                {webhookSecretInput.includes('•') ? (
                  <span className="text-red-500 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Placeholder bullets detected. Please paste your actual Shared Secret.
                  </span>
                ) : webhookSecretInput.startsWith('whsec_') ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Recognized Shared Secret format ({webhookSecretInput.length} chars)
                  </span>
                ) : (
                  <span className="text-neutral-500 flex items-center gap-1">
                    Key length: {webhookSecretInput.length} characters
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Diagnostic Connection Test Button */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t" style={{ borderColor: themeColors.border }}>
            <div>
              <p className="text-xs font-bold" style={{ color: themeColors.text }}>
                Live Credential & API Validation
              </p>
              <p className="text-[11px]" style={{ color: themeColors.muted }}>
                Validates Public Key against Safepay order init & Secret Key against Passport API.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
              style={{ borderColor: themeColors.border, color: themeColors.text }}
            >
              {testing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5 text-indigo-500" />}
              <span>
                {testing
                  ? 'Verifying with Safepay...'
                  : (apiKeyInput.trim() || secretKeyInput.trim())
                  ? 'Test Entered Keys'
                  : (status?.hasApiKey || status?.hasSecretKey)
                  ? 'Test Stored Credentials'
                  : 'Test API Connection'}
              </span>
            </button>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-500/10 border-red-500/20 text-red-800 dark:text-red-300'
              }`}
            >
              {testResult.success ? <Check className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <div className="whitespace-pre-line leading-relaxed">{testResult.message}</div>
            </div>
          )}
        </div>

        {/* Save Error Box */}
        {saveError && (
          <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>Failed to Save Credentials</span>
            </div>
            <p className="leading-relaxed">{saveError}</p>
          </div>
        )}

        {/* Save Action Bar */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: themeColors.primary }}
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : savedSuccess ? 'Safepay Configured!' : 'Save Gateway Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
