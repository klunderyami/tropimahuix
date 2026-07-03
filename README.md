# 🌴 Tropicaña - Licores y Toritos Artesanales

Plataforma de e-commerce full-stack para la venta de licores y toritos artesanales con panel de administración.

## 🚀 Características

✅ **Frontend React + TypeScript**
- Interfaz moderna con Tailwind CSS
- Carrito de compras en tiempo real
- Catálogo filtrable por categoría
- Sistema de autenticación con Firebase
- Panel de administración protegido

✅ **Backend Express + Node.js**
- API REST con TypeScript
- Integración con Firebase Admin SDK
- Pasarela de pagos PayPal
- Gestión de órdenes y stock
- Notificaciones por webhook

✅ **Infraestructura**
- Firestore para base de datos
- Hosting en Render
- CI/CD automático en GitHub

---

## 📋 Requisitos Previos

- **Node.js 24+** (según render.yaml)
- **npm** o **yarn**
- Cuenta de **Firebase** con Firestore habilitado
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

# Opción 1: Usar FIREBASE_CONFIG_BASE64 (recomendado para Render)
FIREBASE_CONFIG_BASE64=eyJwcm9qZWN0SWQiOiAidHVfcHJveWVjdG9pZCIsIC4uLn0=

# Opción 2: O usar variables individuales (para desarrollo local)
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
     ```bash
     cat service-account-key.json | base64
     ```

### 5. Configurar PayPal

1. Ve a [PayPal Developer](https://developer.paypal.com)
2. Crea una aplicación en Sandbox
3. Obtén Client ID y Secret
4. Agrega las credenciales a `.env` y `server/.env`

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

FIREBASE_CONFIG_BASE64=eyJwcm9qZWN0SWQiOiAi... (tu config en Base64)
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
- Revisa que Firestore está habilitado en tu proyecto
- Comprueba que el archivo de credenciales está disponible

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
| `VITE_FIREBASE_ADMIN_UID` o `VITE_ADMIN_UID` | Frontend | ✅ | UID de Firebase del administrador |
| `VITE_API_BASE_URL` | Frontend | ✅ | URL base de la API (/ en producción) |
| `FIREBASE_*` | Frontend | ✅ | Credenciales de Firebase Client |
| `PAYPAL_CLIENT_ID` | Frontend | ✅ | ID de cliente PayPal |
| `NODE_ENV` | Backend | ✅ | `production` en Render |
| `NODE_VERSION` | Backend | ✅ | `24` (según render.yaml) |
| `FIREBASE_ADMIN_*` | Backend | ✅ | Credenciales de Firebase Admin |
| `PAYPAL_CLIENT_SECRET` | Backend | ✅ | Secret de PayPal (nunca en frontend) |

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
