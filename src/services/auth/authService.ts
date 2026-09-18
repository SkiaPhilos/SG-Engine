import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../supabase/client';

export const BOOTSTRAP_ADMIN_EMAIL = (
  (import.meta.env.VITE_ADMIN_EMAIL as string) ||
  'maniacphilos@gmail.com'
).trim().toLowerCase();

export type { User };

export interface AdminAuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Ensures the super admin row is present in the `admins` table
 * whenever the bootstrap administrator signs in.
 */
export async function recordAdminIfBootstrap(user: User): Promise<void> {
  const userEmail = (user.email || '').trim().toLowerCase();
  if (userEmail && userEmail === BOOTSTRAP_ADMIN_EMAIL) {
    try {
      await supabase.from('admins').upsert(
        {
          admin_uid: user.id,
          email: userEmail,
          role: 'super_admin',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'admin_uid' }
      );
    } catch (err) {
      console.warn('Admin record write warning:', err);
    }
  }
}

/**
 * Sign in as store administrator using email and password.
 */
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase credentials are not yet configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
    );
  }

  const cleanEmail = email.trim().toLowerCase();

  // Sign in with Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: pass,
  });

  if (error) {
    throw error;
  }

  if (data?.user) {
    await recordAdminIfBootstrap(data.user);
    return data.user;
  }

  throw new Error('Authentication failed. No user session returned.');
}

/**
 * Sign up a new store administrator account.
 */
export async function signUpAdmin(email: string, pass: string): Promise<{ user: User | null; sessionActive: boolean; message?: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase credentials are not yet configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
    );
  }

  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: pass,
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    await recordAdminIfBootstrap(data.user);
  }

  const sessionActive = Boolean(data.session);
  return {
    user: data.user,
    sessionActive,
    message: sessionActive
      ? 'Administrator account created and signed in successfully.'
      : 'Account created! If email confirmation is enabled in your Supabase project, please check your inbox to confirm before signing in.',
  };
}

/**
 * Sends a password reset email for an administrator account.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase credentials are not yet configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
    );
  }

  const cleanEmail = email.trim().toLowerCase();
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${window.location.origin}/#admin`,
  });

  if (error) {
    throw error;
  }
}

/**
 * Sign in using Google OAuth provider configured in Supabase.
 */
export async function loginWithGoogle(): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase credentials are not yet configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
    );
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/#admin`,
    },
  });

  if (error) {
    console.error('Google login error:', error);
    throw error;
  }
}

/**
 * Sign out current admin user session.
 */
export async function logout(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase.auth.signOut();
}

export const logoutAdmin = logout;

/**
 * Validates whether the given user possesses admin privileges.
 */
export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;
  const userEmail = (user.email || '').trim().toLowerCase();

  if (BOOTSTRAP_ADMIN_EMAIL && userEmail === BOOTSTRAP_ADMIN_EMAIL) {
    recordAdminIfBootstrap(user).catch(() => {});
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('admins')
      .select('admin_uid')
      .eq('admin_uid', user.id)
      .maybeSingle();

    if (!error && data) return true;

    // If admins table has zero rows yet, first user to log in claims super_admin role!
    const { count, error: countError } = await supabase
      .from('admins')
      .select('*', { count: 'exact', head: true });

    if (!countError && (count === 0 || count === null)) {
      await supabase.from('admins').upsert(
        {
          admin_uid: user.id,
          email: userEmail,
          role: 'super_admin',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'admin_uid' }
      );
      return true;
    }

    return false;
  } catch (error) {
    console.warn('checkIsAdmin error:', error);
    return false;
  }
}

/**
 * Subscribes to real-time authentication session changes across the app.
 */
export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  if (!isSupabaseConfigured()) {
    callback(null);
    return () => {};
  }

  // Initial user check
  supabase.auth.getUser().then(({ data }) => {
    callback(data?.user || null);
  }).catch(() => {
    callback(null);
  });

  // Listen for Supabase session changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });

  return () => {
    subscription.unsubscribe();
  };
}
