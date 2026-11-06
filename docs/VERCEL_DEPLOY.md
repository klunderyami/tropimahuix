# Despliegue de Tropimahuix en Vercel

Este cambio migra **frontend Vite y API Express** desde Render a Vercel, conservando Supabase, Firebase y PayPal. No modifica el DNS ni las claves.

1. Importar `klunderyami/tropimahuix` en Vercel, con directorio raíz del repositorio y framework Vite.
2. Build: `npm run build`. Output: `dist`. Node.js: 24.x si está disponible.
3. Configurar en Vercel las mismas variables privadas que utiliza el hosting actual: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `PAYPAL_CURRENCY`, `ADMIN_UID` o `FIREBASE_ADMIN_UID`, y cualquier variable de webhooks usada. No subir sus valores a Git.
4. Variables del navegador: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_ADMIN_UID` si aplica. `VITE_API_BASE_URL` y `API_BASE_URL` deben apuntar a la URL de Vercel o usarse como ruta relativa según la implementación del cliente; no mantener la URL de Render.
5. Probar `/api/health`, catálogo, inicio de sesión, permisos admin, carrito, pedidos, captura PayPal en entorno de prueba, formularios y webhooks antes de activar pagos reales.
6. Verificar límites de funciones serverless y que no existan procesos persistentes, sockets o trabajos de larga duración; esos flujos necesitan servicios externos.
7. Cambiar DNS solo después de validar el despliegue y confirmar la URL final. Mantener Render temporalmente para rollback.

**Nota:** El código del servidor todavía contiene referencias públicas a Render (robots/sitemap). Revisarlas al confirmar el dominio final. Las políticas RLS del PR también requieren pruebas con un administrador real.
