# 🌴 Tropicaña - Licores y Toritos Artesanales

Plataforma de e-commerce full-stack para la venta de licores y toritos artesanales con panel de administración.

## 🚀 Características

✅ **Frontend React + TypeScript**
- Interfaz moderna con Tailwind CSS
- Carrito de compras en tiempo real
- Catálogo filtrable por categoría
- Sistema de autenticación con Firebase
- Pasarela de pagos segura con PayPal
- Panel de administración protegido

✅ **Backend Express + Node.js**
- API REST con TypeScript
- Integración con Firebase Admin SDK para autenticación
- Conexión segura a Supabase con `service_role` para operaciones de base de datos
- Gestión de órdenes, stock y subida de archivos
- Notificaciones por webhook

✅ **Infraestructura**
- **Supabase (Postgres)** para base de datos
- **Supabase Storage** para almacenamiento de imágenes de productos
- Hosting en Render
- CI/CD automático en GitHub

---

## 📋 Requisitos Previos

- **Node.js 24+** (según render.yaml)
- **npm** o **yarn**
- Cuenta de **Firebase** para Autenticación
- Cuenta de **Supabase**
- Cuenta de **PayPal Developer**
- Cuenta de **Render**

---

## 🔧 Configuración Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/klunderyami/tropimahuix.git
cd tropimahuix
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno

#### Frontend (`.env` en raíz)
```dotenv
# ID de usuario de Firebase que tendrá acceso al panel de administración. Puedes usar VITE_FIREBASE_ADMIN_UID o VITE_ADMIN_UID.
VITE_FIREBASE_ADMIN_UID=tu_admin_uid_aqui
VITE_API_BASE_URL=/
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key

VITE_PAYPAL_CLIENT_ID=tu_paypal_client_id_aqui

VITE_FIREBASE_API_KEY=tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto_id_aqui
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id_aqui
VITE_FIREBASE_APP_ID=1:XXXXXXXXXXXX:XXXXXXXXXXXXXXX
```

#### Backend (`server/.env`)
```dotenv
PORT=9005
CLIENT_ORIGIN=http://localhost:5173
ADMIN_UID=tu_admin_uid_aqui
NOTIFICATION_WEBHOOK_URL=tu_webhook_aqui

PAYPAL_MODE=sandbox
PAYPAL_CURRENCY=MXN
PAYPAL_CLIENT_ID=tu_paypal_client_id_aqui
PAYPAL_CLIENT_SECRET=tu_paypal_client_secret_aqui

SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=tu_supabase_service_role_key

# Credenciales de Firebase Admin (para verificar tokens de usuario)
FIREBASE_ADMIN_PROJECT_ID=tu_proyecto_id_aqui
FIREBASE_ADMIN_CLIENT_EMAIL=tu_cuenta_servicio@tu_proyecto.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY_AQUI\n-----END PRIVATE KEY-----\n"
```

### 4. Obtener credenciales de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. **Para Frontend:**
   - Ir a "Project Settings" → "Your apps"
   - Copia las credenciales bajo "firebaseConfig"
4. **Para Backend:**
   - Ir a "Project Settings" → "Service Accounts"
   - Haz clic en "Generate New Private Key"
   - Copia el JSON completo o convierte a Base64:

### 5. Configurar PayPal

1. Ve a [PayPal Developer](https://developer.paypal.com)
2. Crea una aplicación en Sandbox
3. Obtén Client ID y Secret
4. Agrega las credenciales a `.env` y `server/.env`

### 6. Configurar Supabase

1. Ve a Supabase y crea un proyecto.
2. En "Project Settings" → "API":
   - Copia la URL del proyecto y la `anon` `public` key para el archivo `.env` del frontend.
   - Copia la `service_role` `secret` key para el archivo `server/.env` del backend.
3. En "Storage", crea un nuevo bucket llamado `productos` y márcalo como público.

---

## 🚀 Desarrollo Local

### Iniciar en modo desarrollo
```bash
npm run dev
```

Esto inicia:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:9005

### Compilar para producción
```bash
npm run build
```

### Verificar en modo preview
```bash
npm run preview
```

---

## 📦 Deployment en Render

### 1. Conectar repositorio a Render

1. Ve a [render.com](https://render.com)
2. Conecta tu cuenta de GitHub
3. Selecciona "New Web Service"
4. Selecciona este repositorio

### 2. Configurar ambiente

**Build Command:**
```
npm ci --include=dev && npm run build
```

**Start Command:**
```
npm start
```

### 3. Agregar variables de entorno en Render

**Frontend (Vite)**
```
# ID de usuario de Firebase que tendrá acceso al panel de administración. Puedes usar VITE_FIREBASE_ADMIN_UID o VITE_ADMIN_UID.
VITE_FIREBASE_ADMIN_UID=tu_admin_uid_aqui
VITE_API_BASE_URL=/
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key

VITE_PAYPAL_CLIENT_ID=tu_paypal_sandbox_id
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

**Backend (Express)**
```
NODE_ENV=production
NODE_VERSION=24
PORT=3000 (Render asigna automáticamente)
CLIENT_ORIGIN=https://tu-dominio-en-render.onrender.com
ADMIN_UID=tu_admin_uid_aqui
NOTIFICATION_WEBHOOK_URL=tu_webhook_url (Discord, Slack, etc)

PAYPAL_MODE=sandbox
PAYPAL_CURRENCY=MXN
PAYPAL_CLIENT_ID=tu_paypal_sandbox_id
PAYPAL_CLIENT_SECRET=tu_paypal_secret

SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=tu_supabase_service_role_key
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY_AQUI\n-----END PRIVATE KEY-----\n"
```

### 4. Propiedades recomendadas en Render

- **Plan**: Free o Starter
- **Node.js Version**: 24
- **Auto-Deploy**: ON
- **Health Check Path**: `/api/health`

---

## 🔐 Acceso de Administración

### Obtener tu Admin UID

1. **Ir a `/admin`** en tu sitio
2. Haz clic en "Iniciar sesión administrativa"
3. Auténticate con tu Google
4. Abre la consola del navegador (F12)
5. Ejecuta:
   ```javascript
   firebase.auth().currentUser.uid
   ```
6. Copia el UID y guárdalo

### Configurar como Admin

1. Agrega tu UID a las variables de entorno (puedes usar VITE_FIREBASE_ADMIN_UID o VITE_ADMIN_UID para el frontend):
   - `.env` → `VITE_ADMIN_UID=tu_uid`
   - `server/.env` → `ADMIN_UID=tu_uid`
   - Render → `VITE_ADMIN_UID=tu_uid` y `ADMIN_UID=tu_uid`

2. Redeploy el sitio

3. Intenta acceder a `/admin` nuevamente

---

## 🐛 Solución de Problemas

### "Backend no disponible"
- Verifica que el backend esté corriendo: `http://localhost:9005/api/health`
- Revisa los logs de Render
- Asegúrate que `VITE_API_BASE_URL=/` está configurado

### "No tengo acceso al panel admin"
- Verifica que tu `VITE_ADMIN_UID` coincida con tu UID real
- Asegúrate de estar autenticado (botón "Entrar" en navbar)
- Revisa la consola del navegador para errores

### "Error de Firebase"
- Verifica que todas las `VITE_FIREBASE_*` variables están configuradas
- Revisa que la **Autenticación de Firebase** esté habilitada en tu proyecto
- Comprueba que las credenciales del SDK de Admin (en el backend) sean correctas

### "PayPal no funciona"
- Verifica que estás en modo Sandbox (`PAYPAL_MODE=sandbox`)
- Comprueba Client ID y Secret en credenciales
- Prueba con estas tarjetas de prueba PayPal:
  - Visa: `4532015112830366`
  - MasterCard: `5425233010103442`

---

## 📁 Estructura del Proyecto

```
tropimahuix/
├── src/                          # Frontend React
│   ├── components/               # Componentes reutilizables
│   │   ├── AdminDashboard.tsx   # Panel de administración
│   │   ├── AdminRoute.tsx       # Protección de rutas admin
│   │   ├── Navbar.tsx           # Navegación
│   │   └── ...
│   ├── contexts/                # Context API
│   │   └── CartContext.tsx      # Carrito de compras
│   ├── hooks/                   # Hooks personalizados
│   │   └── useAdminAccess.ts    # Verificación de admin
│   ├── firebase.ts              # Configuración Firebase
│   ├── app.tsx                  # Rutas principales
│   └── main.tsx                 # Entry point
├── server/                       # Backend Express
│   ├── index.ts                 # Servidor principal
│   ├── productBatchUpload.ts    # Carga de productos
│   └── tsconfig.json
├── package.json                 # Dependencias
├── render.yaml                  # Configuración Render
├── vite.config.ts               # Configuración Vite
└── README.md                    # Este archivo
```

---

## 🔑 Variables de Entorno Críticas

| Variable | Frontend/Backend | Requerida | Descripción |
|----------|-----------------|----------|-------------|
| `VITE_FIREBASE_ADMIN_UID` | Frontend | ✅ | UID de Firebase del usuario administrador. |
| `VITE_SUPABASE_URL` | Frontend | ✅ | URL pública de tu proyecto Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Frontend | ✅ | Clave anónima (`anon`) pública de Supabase. |
| `VITE_PAYPAL_CLIENT_ID` | Frontend | ✅ | ID de cliente de la aplicación de PayPal. |
| `VITE_FIREBASE_*` | Frontend | ✅ | Resto de credenciales del cliente de Firebase. |
| `NODE_ENV` | Backend | ✅ | `production` en Render |
| `ADMIN_UID` | Backend | ✅ | UID de Firebase del usuario administrador. |
| `SUPABASE_URL` | Backend | ✅ | URL pública de tu proyecto Supabase. |
| `SUPABASE_SERVICE_KEY` | Backend | ✅ | Clave de `service_role` de Supabase (secreta). |
| `FIREBASE_ADMIN_*` | Backend | ✅ | Credenciales de Firebase Admin para verificar tokens. |
| `PAYPAL_CLIENT_ID` | Backend | ✅ | ID de cliente de la aplicación de PayPal. |
| `PAYPAL_CLIENT_SECRET` | Backend | ✅ | Secret de la aplicación de PayPal (secreta). |

---

## 📞 Soporte

Para reportar problemas:
1. Abre un issue en GitHub
2. Incluye:
   - Los logs de error
   - El navegador y versión
   - Los pasos para reproducir

---

## 📄 Licencia

Todos los derechos reservados © 2026 Tropicaña. Licores y Toritos 100% Artesanales.
