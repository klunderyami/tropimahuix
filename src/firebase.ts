import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail as fbSendSignInLinkToEmail,
  isSignInWithEmailLink as fbIsSignInWithEmailLink,
  signInWithEmailLink as fbSignInWithEmailLink,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  UserCredential,
  ActionCodeSettings,
} from 'firebase/auth';

// --- Configuración ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// --- Inicialización ---
const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

// --- Autenticación con Google ---
const googleProvider = new GoogleAuthProvider();
export const login = (): Promise<UserCredential> => signInWithPopup(auth, googleProvider);

// --- Autenticación con Correo y Contraseña ---
export const loginWithEmail = (email: string, password: string): Promise<UserCredential> =>
  signInWithEmailAndPassword(auth, email, password);

// --- Autenticación con Enlace Mágico (Passwordless) ---

// Base settings for magic links
const actionCodeSettingsBase: ActionCodeSettings = {
  handleCodeInApp: true,
  url: `${window.location.origin}/magic-link-handler`,
};

// Specific settings for admin login, redirecting to a different verification page
export const actionCodeSettingsAdmin: ActionCodeSettings = {
  ...actionCodeSettingsBase,
  url: `${window.location.origin}/admin/verify-link`,
};

/**
 * Sends a magic link for general user login.
 */
export const sendLoginLink = (email: string): Promise<void> => {
  return fbSendSignInLinkToEmail(auth, email, actionCodeSettingsBase);
};

/**
 * This is exported to match the existing call signature in LoginAdmin.tsx
 */
export const sendSignInLinkToEmail = (authInstance: Auth, email: string, settings: ActionCodeSettings): Promise<void> =>
  fbSendSignInLinkToEmail(authInstance, email, settings);

export const isLoginLink = (link: string): boolean => fbIsSignInWithEmailLink(auth, link);

export const isSignInWithEmailLink = (authInstance: Auth, link: string): boolean =>
  fbIsSignInWithEmailLink(authInstance, link);

export const completeLogin = (email: string, link: string): Promise<UserCredential> =>
  fbSignInWithEmailLink(auth, email, link);

export const signInWithEmailLink = (authInstance: Auth, email: string, link: string): Promise<UserCredential> =>
  fbSignInWithEmailLink(authInstance, email, link);

// Re-export onAuthStateChanged for convenience
export { onAuthStateChanged };