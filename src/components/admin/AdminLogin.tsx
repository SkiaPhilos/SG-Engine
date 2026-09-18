import React, { useState } from 'react';
import { Shield, Lock, AlertCircle, ArrowLeft, KeyRound, Mail, Eye, EyeOff, CheckCircle2, UserPlus, LogIn, HelpCircle } from 'lucide-react';
import { loginWithGoogle, loginWithEmail, signUpAdmin, sendPasswordReset } from '../../services/auth/authService';
import { useStore } from '../../context/StoreContext';

export const AdminLogin: React.FC = () => {
  const { setCurrentView, checkAdminStatus, themeColors } = useStore();
  
  // Clean, zero-leak state: start with empty credentials
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await loginWithGoogle();
      const isAdmin = await checkAdminStatus();
      if (!isAdmin) {
        setError(
          'Signed in with Google, but this account does not possess administrator rights. Please verify your admin privileges.'
        );
      } else {
        setCurrentView('admin');
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      const msg = err.message || '';
      if (msg.includes('popup-blocked') || msg.includes('popup-closed')) {
        setError('Google sign-in popup was closed or blocked. Please allow popups or try again.');
      } else {
        setError(msg || 'Google authentication could not be completed. Please ensure Google Auth is enabled in your Supabase project.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your administrator email address.');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        await sendPasswordReset(cleanEmail);
        setSuccessMessage('Password reset instructions have been dispatched to your email address.');
      } catch (err: any) {
        setError(err.message || 'Unable to send password reset email. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }

      setLoading(true);
      try {
        const result = await signUpAdmin(cleanEmail, password);
        if (result.sessionActive) {
          const isAdmin = await checkAdminStatus();
          if (isAdmin) {
            setCurrentView('admin');
          } else {
            setSuccessMessage(result.message || 'Administrator account registered successfully.');
          }
        } else {
          setSuccessMessage(
            result.message || 'Account created! If confirmation is required, please check your email before signing in.'
          );
          setMode('signin');
        }
      } catch (err: any) {
        console.error('Admin signup error:', err);
        const msg = err.message || '';
        if (msg.toLowerCase().includes('already registered')) {
          setError('An account with this email already exists. Please sign in with your existing password.');
          setMode('signin');
        } else {
          setError(msg || 'Failed to create administrator account.');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Sign In Mode
    setLoading(true);
    try {
      await loginWithEmail(cleanEmail, password);
      const isAdmin = await checkAdminStatus();
      if (!isAdmin) {
        setError('Signed in successfully, but this user does not have administrator privileges.');
      } else {
        setCurrentView('admin');
      }
    } catch (err: any) {
      console.error('Email login error:', err);
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        setError(
          'Incorrect email or password. If you have not registered this administrator account yet, please use the "Create Admin Account" tab.'
        );
      } else if (msg.includes('email not confirmed')) {
        setError(
          'Email address not yet confirmed. Please check your inbox for the Supabase confirmation email, or disable "Confirm email" in Supabase Auth settings.'
        );
      } else if (msg.includes('not yet configured')) {
        setError(err.message);
      } else if (msg.includes('rate limit') || msg.includes('too many')) {
        setError('Too many attempts. Please wait a moment before trying again.');
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
        {/* Return to storefront */}
        <button
          type="button"
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

        {/* Security Shield Header */}
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

        {/* Status Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{successMessage}</span>
          </div>
        )}

        {/* Google OAuth Access */}
        {mode !== 'forgot' && (
          <div className="space-y-2.5">
            <button
              id="google-admin-login-btn"
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-3 shadow-md transition-all active:scale-98 hover:opacity-95 disabled:opacity-50"
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
              <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
            </button>
            <p className="text-[11px] text-center" style={{ color: themeColors.muted }}>
              Sign in with your Google account to receive administrator access.
            </p>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t" style={{ borderColor: themeColors.border }}></div>
              <span className="flex-shrink mx-3 text-[11px] font-medium" style={{ color: themeColors.muted }}>
                or with email credentials
              </span>
              <div className="flex-grow border-t" style={{ borderColor: themeColors.border }}></div>
            </div>
          </div>
        )}

        {/* Mode Selector Tabs */}
        {mode !== 'forgot' && (
          <div
            className="flex p-1 rounded-xl border text-xs font-semibold"
            style={{
              backgroundColor: themeColors.background,
              borderColor: themeColors.border,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'signin'
                  ? 'bg-white dark:bg-neutral-800 shadow-xs font-bold text-neutral-900 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'signup'
                  ? 'bg-white dark:bg-neutral-800 shadow-xs font-bold text-neutral-900 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold" style={{ color: themeColors.text }}>
              Administrator Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@yourdomain.com"
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

          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold" style={{ color: themeColors.text }}>
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
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
          )}

          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold" style={{ color: themeColors.text }}>
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pl-10 pr-10 rounded-xl text-xs border outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  }}
                />
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
            style={{ borderColor: themeColors.border, color: themeColors.text }}
          >
            <Lock className="w-4 h-4" />
            <span>
              {loading
                ? 'Processing...'
                : mode === 'signin'
                ? 'Sign In with Password'
                : mode === 'signup'
                ? 'Register Administrator Account'
                : 'Send Password Reset Link'}
            </span>
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setSuccessMessage(null);
              }}
              className="w-full text-center text-xs font-semibold text-neutral-500 hover:underline pt-1"
            >
              Back to Sign In
            </button>
          )}
        </form>

        {/* Security Assurance footer */}
        <div
          className="p-3 rounded-xl bg-neutral-50/80 dark:bg-neutral-850/80 border text-[11px] flex items-center gap-2"
          style={{ borderColor: themeColors.border, color: themeColors.muted }}
        >
          <Lock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>Encrypted session protected by Supabase Row-Level Security.</span>
        </div>
      </div>
    </div>
  );
};
