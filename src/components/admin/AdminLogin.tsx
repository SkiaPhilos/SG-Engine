import React, { useState } from 'react';
import { Shield, Lock, AlertCircle, ArrowLeft, KeyRound, Sparkles, Mail, Eye, EyeOff, ExternalLink, CheckCircle } from 'lucide-react';
import { loginWithGoogle, loginWithEmail, BOOTSTRAP_ADMIN_EMAIL } from '../../services/auth/authService';
import { useStore } from '../../context/StoreContext';

export const AdminLogin: React.FC = () => {
  const { setCurrentView, checkAdminStatus, themeColors } = useStore();
  const [email, setEmail] = useState('maniacphilos@gmail.com');
  const [password, setPassword] = useState('Philos@2006');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setIsPopupBlocked(false);
    try {
      await loginWithGoogle();
      const isAdmin = await checkAdminStatus();
      if (!isAdmin) {
        setError(
          `Signed in with Google, but this account is not registered as an authorized store administrator. Authorized email: ${BOOTSTRAP_ADMIN_EMAIL}`
        );
      } else {
        setCurrentView('admin');
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        setIsPopupBlocked(true);
        setError('Google sign-in popup was blocked by your browser. Please allow popups or open this app in a new tab.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled before completion. Please try again.');
      } else {
        setError(err.message || 'Authentication was interrupted. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both administrator email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setIsPopupBlocked(false);

    try {
      await loginWithEmail(email, password);
      const isAdmin = await checkAdminStatus();
      if (!isAdmin) {
        setError(
          `Signed in successfully, but this account is not registered as an authorized store administrator. Authorized email: ${BOOTSTRAP_ADMIN_EMAIL}`
        );
      } else {
        setCurrentView('admin');
      }
    } catch (err: any) {
      console.error('Email login error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError(
          'Email & password authentication is disabled in this Firebase project. Please click "Sign In with Google" above using maniacphilos@gmail.com to enter the admin dashboard.'
        );
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password or credentials. Please verify your administrator details.');
      } else if (err.code === 'auth/user-not-found') {
        setError('Administrator account not found for this email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Access temporarily disabled due to many failed attempts. Please use Google Sign-In.');
      } else {
        setError(err.message || 'Authentication could not be completed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 transition-colors"
      style={{ backgroundColor: themeColors.background }}
    >
      <div
        className="w-full max-w-md rounded-3xl border shadow-xl p-6 sm:p-8 space-y-6"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
          color: themeColors.text,
        }}
      >
        {/* Top return link */}
        <button
          onClick={() => {
            if (window.location.hash === '#admin') {
              window.location.hash = '';
            }
            setCurrentView('store');
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ color: themeColors.muted }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Storefront</span>
        </button>

        {/* Branding & Shield */}
        <div className="text-center space-y-2">
          <div
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md"
            style={{ backgroundColor: themeColors.primary }}
          >
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Store Administrator</h1>
          <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: themeColors.muted }}>
            Private control center for store configuration, catalog, theme, and order fulfillment.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
            {isPopupBlocked && (
              <div className="pt-1">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 underline hover:opacity-80"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open app in new tab to enable popups</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Primary Recommended Auth: Google Sign-In */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: themeColors.muted }}>
              Admin Sign-In
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Instant Access
            </span>
          </div>

          <button
            id="google-admin-login-primary-btn"
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-3 shadow-md transition-all active:scale-98 hover:opacity-95 disabled:opacity-50"
            style={{ backgroundColor: themeColors.primary }}
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
            </svg>
            <span>{loading ? 'Authenticating with Google...' : `Continue with Google (${BOOTSTRAP_ADMIN_EMAIL})`}</span>
          </button>
          <p className="text-[11px] text-center" style={{ color: themeColors.muted }}>
            Sign in with your Google account to automatically receive full admin rights.
          </p>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t" style={{ borderColor: themeColors.border }}></div>
          <span className="flex-shrink mx-3 text-[11px] font-medium" style={{ color: themeColors.muted }}>
            or with email & password
          </span>
          <div className="flex-grow border-t" style={{ borderColor: themeColors.border }}></div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: themeColors.text }}>
              Administrator Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-3.5 py-2.5 pl-10 rounded-xl text-xs border outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
                style={{
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                }}
              />
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold" style={{ color: themeColors.text }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setEmail('maniacphilos@gmail.com');
                  setPassword('Philos@2006');
                }}
                className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Autofill Credentials
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pl-10 pr-10 rounded-xl text-xs border outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
                style={{
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                }}
              />
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
            style={{ borderColor: themeColors.border, color: themeColors.text }}
          >
            <Lock className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In with Password'}</span>
          </button>
        </form>

        {/* Security Notice */}
        <div
          className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850 border text-[11px] space-y-1"
          style={{ borderColor: themeColors.border, color: themeColors.muted }}
        >
          <div className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Authorized Administrator Email</span>
          </div>
          <p className="font-mono text-[11px] text-neutral-700 dark:text-neutral-300">
            {BOOTSTRAP_ADMIN_EMAIL}
          </p>
        </div>
      </div>
    </div>
  );
};


