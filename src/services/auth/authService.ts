import {
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';

export const BOOTSTRAP_ADMIN_EMAIL = 'maniacphilos@gmail.com';

export interface AdminAuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

async function recordAdminIfBootstrap(user: User): Promise<void> {
  if (user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
    try {
      await setDoc(
        doc(db, 'admins', user.uid),
        {
          email: user.email.toLowerCase(),
          role: 'super_admin',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Admin record write warning:', err);
    }
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    await recordAdminIfBootstrap(cred.user);
    return cred.user;
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed') {
      const helpfulError = new Error(
        'Firebase password authentication is disabled in this project. Please use "Sign In with Google" using maniacphilos@gmail.com to access the administrator dashboard.'
      );
      (helpfulError as any).code = 'auth/operation-not-allowed';
      throw helpfulError;
    }

    // If user is the designated bootstrap admin and account doesn't exist yet, attempt creation
    if (
      cleanEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() &&
      (err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password')
    ) {
      try {
        const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        await recordAdminIfBootstrap(newCred.user);
        return newCred.user;
      } catch (createErr: any) {
        if (createErr.code === 'auth/operation-not-allowed') {
          const helpfulError = new Error(
            'Firebase password authentication is disabled in this project. Please use "Sign In with Google" using maniacphilos@gmail.com to access the administrator dashboard.'
          );
          (helpfulError as any).code = 'auth/operation-not-allowed';
          throw helpfulError;
        }
        // If already in use, throw original error
        if (createErr.code !== 'auth/email-already-in-use') {
          throw createErr;
        }
      }
    }
    throw err;
  }
}

export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await recordAdminIfBootstrap(result.user);
    return result.user;
  } catch (error: any) {
    console.error('Google login error:', error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export const logoutAdmin = logout;

export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
    // Ensure admin document exists in background
    recordAdminIfBootstrap(user).catch(() => {});
    return true;
  }
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists();
  } catch (error) {
    // If unauthenticated or no admin doc, not an admin
    return false;
  }
}
