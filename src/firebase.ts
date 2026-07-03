import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, signInWithEmailAndPassword, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocFromServer } from 'firebase/firestore';

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

export const db = getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Detectar si estamos en producción (Render) o local
const isProduction = !window.location.hostname.includes('localhost');

// Auth functions
export const login = async () => {
  if (isProduction) {
    // En producción (Render), usar redirect obligatoriamente
    await signInWithRedirect(auth, googleProvider);
  } else {
    // En local, intentar con popup
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

// Error Handling Spec for Firestore Operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  onAuthStateChanged,
  signInWithEmailAndPassword
};
export type { User };