import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, signInWithEmailAndPassword, User, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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

export const db = getFirestore(app);
export const storage = getStorage(app);

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
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
};
export type { User };

// ─── Firebase Storage: Subida de imágenes ────────────────────────────────────

/**
 * Helper para añadir timeout a una promesa (evita bloqueos indefinidos en uploads)
 */
function withTimeout<T>(p: Promise<T>, ms = 30000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operación timed out after ${ms}ms`));
    }, ms);
    p.then((v) => {
      clearTimeout(timer);
      resolve(v);
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Comprime una imagen usando Canvas API para reducir su tamaño antes de subirla
 * @param file - Archivo de imagen original
 * @param maxWidth - Ancho máximo (default 1200px)
 * @param quality - Calidad de compresión 0-1 (default 0.8)
 * @returns Promise con el archivo comprimido
 */
async function compressImage(file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Crear canvas y dibujar imagen redimensionada
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('No se pudo crear el contexto de canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir la imagen'));
              return;
            }
            
            // Crear nuevo archivo con el blob comprimido
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            console.log(`📸 Imagen comprimida: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB (${Math.round((1 - compressedFile.size / file.size) * 100)}% reducción)`);
            
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen para compresión'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'));
    reader.readAsDataURL(file);
  });
}

/**
 * Sube un archivo de imagen a Firebase Storage dentro de la carpeta 'productos/'.
 * @param file - Archivo de imagen seleccionado por el usuario.
 * @param productName - Nombre del producto (para generar un nombre legible).
 * @returns La URL de descarga pública de la imagen subida.
 */
export async function uploadProductImage(file: File, productName: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const safeName = productName
    .normalize('NFD')
    .replace(/[̀-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'producto';

  // Usar extensión .jpg para todas las imágenes (mejor compresión)
  const fileName = `${timestamp}-${safeName}.jpg`;
  const storageRef = ref(storage, `productos/${fileName}`);

  try {
    // Validar tamaño del archivo (máximo 5MB antes de comprimir)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error(`La imagen es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). El tamaño máximo permitido es 5MB. Por favor, selecciona una imagen más pequeña.`);
    }

    // Comprimir imagen para reducir tiempo de subida
    console.log('📸 Comprimiendo imagen...');
    const compressedFile = await compressImage(file, 1200, 0.8);
    
    // Subida con timeout extendido (90s) para conexiones lentas
    console.log('📤 Subiendo imagen a Firebase Storage...');
    const snapshot = await withTimeout(uploadBytes(storageRef, compressedFile), 90000);
    
    // Obtener URL con timeout de 15s
    const downloadUrl = await withTimeout(getDownloadURL(snapshot.ref), 15000);
    
    console.log('✅ Imagen subida exitosamente:', downloadUrl);
    return downloadUrl;
  } catch (err) {
    console.error('Error en uploadProductImage:', err);
    
    // Mejorar mensaje de error para el usuario
    if (err instanceof Error) {
      if (err.message.includes('timed out')) {
        throw new Error('⏱️ La subida de la imagen tardó demasiado. Verifica tu conexión a internet e intenta con una imagen más pequeña (máximo 5MB).');
      } else if (err.message.includes('permission-denied') || err.message.includes('unauthenticated')) {
        throw new Error('🔐 No tienes permisos para subir imágenes. Verifica que estés autenticado como administrador.');
      } else if (err.message.includes('canceled')) {
        throw new Error('🚫 La subida de la imagen fue cancelada.');
      } else if (err.message.includes('demasiado grande')) {
        throw err; // Ya tiene un mensaje amigable
      } else {
        throw new Error(`Error al subir la imagen: ${err.message}`);
      }
    }
    throw new Error('Error desconocido al subir la imagen. Por favor, intenta de nuevo.');
  }
}
