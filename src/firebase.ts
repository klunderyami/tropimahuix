import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, signInWithEmailAndPassword, User, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';

function getRequiredEnv(name: string): string {
  // `import.meta.env` es el método estándar y seguro en Vite para acceder a las variables de entorno del cliente.
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing required Firebase environment variable: ${name}`);
  }
  return value;
}

const firebaseConfig = {
  apiKey: getRequiredEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getRequiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getRequiredEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getRequiredEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getRequiredEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getRequiredEnv('VITE_FIREBASE_APP_ID'),
};

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// App Check: solo se inicializa si hay una clave configurada explícitamente
// Si no hay clave, NO se inicializa App Check para evitar bloqueos
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY;
const isProduction = !window.location.hostname.includes('localhost');

if (appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();


// -- General Auth --

const actionCodeSettings = {
  url: `${window.location.origin}/auth/magic-link`,
  handleCodeInApp: true,
};

export const sendLoginLink = (email: string) => {
  return sendSignInLinkToEmail(auth, email, actionCodeSettings);
}

export const completeLogin = (email: string, link: string) => {
  return signInWithEmailLink(auth, email, link);
}

export const isLoginLink = (link: string) => {
  return isSignInWithEmailLink(auth, link);
}


// -- Admin Auth --

export const actionCodeSettingsAdmin = {
  url: import.meta.env.VITE_ADMIN_REDIRECT_URL || 'http://localhost:5173/admin/verify-link',
  handleCodeInApp: true,
};

// Auth functions
export const login = async () => {
  if (isProduction) {
    await signInWithRedirect(auth, googleProvider);
  } else {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes('auth/popup-blocked')) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        throw error;
      }
    }
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  await signInWithEmailAndPassword(auth, email, password);
};

export const logout = () => signOut(auth);

// Manejar el resultado del redirect (cuando el usuario regresa de Google)
getRedirectResult(auth)
  .then((result) => {
    if (result?.user) {
      console.log('✅ Usuario autenticado vía redirect:', result.user.uid);
    }
  })
  .catch((error) => {
    console.error('❌ Error en redirect result:', error);
  });

// Mostrar variables de entorno para diagnóstico
console.log('🔍 Diagnóstico Firebase:', {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? '✅ presente' : '❌ faltante',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '❌ faltante',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '❌ faltante',
  isProduction,
  hostname: window.location.hostname,
});

export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
};
export type { User };
