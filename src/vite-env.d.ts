/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_ADMIN_UID: string;
  readonly VITE_FIREBASE_ADMIN_UID?: string;
  readonly VITE_FIREBASE_RECAPTCHA_SITE_KEY?: string;
  readonly VITE_PAYPAL_CLIENT_ID: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIRESTORE_DATABASE_ID?: string;
  readonly DISABLE_HMR?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
