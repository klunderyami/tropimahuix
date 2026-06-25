# 🚀 Guía Completa de Deployment en Render

## Paso 1: Preparar el Repositorio

Verifica que los cambios ya están en GitHub:

```bash
git status
git add .
git commit -m "Setup: Configuración lista para deployment"
git push origin main
```

## Paso 2: Crear el Servicio en Render

### 2.1 Acceder a Render

1. Ve a [render.com](https://render.com)
2. Haz login o crea una cuenta
3. Conecta tu repositorio de GitHub

### 2.2 Crear Web Service

1. Click en "+ New" → "Web Service"
2. Selecciona `klunderyami/tropimahuix`
3. Configura:
   - **Name**: `tropicana` (o tu nombre preferido)
   - **Runtime**: Node
   - **Build Command**: `npm ci --include=dev && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

## Paso 3: Configurar Variables de Entorno en Render

### 3.1 Variables Frontend (Vite)

En el panel de Render, agrega estas variables:

```
VITE_ADMIN_UID=[tu_uid_de_firebase]
VITE_API_BASE_URL=/
VITE_PAYPAL_CLIENT_ID=[tu_paypal_sandbox_id]
VITE_FIREBASE_API_KEY=[tu_firebase_api_key]
VITE_FIREBASE_AUTH_DOMAIN=[tu_proyecto.firebaseapp.com]
VITE_FIREBASE_PROJECT_ID=[tu_firebase_project_id]
VITE_FIREBASE_STORAGE_BUCKET=[tu_firebase_bucket]
VITE_FIREBASE_MESSAGING_SENDER_ID=[tu_sender_id]
VITE_FIREBASE_APP_ID=[tu_app_id]
```

### 3.2 Variables Backend (Express)

```
NODE_ENV=production
NODE_VERSION=24
PORT=3000
CLIENT_ORIGIN=https://tropicana-xxxxx.onrender.com
ADMIN_UID=[tu_uid_de_firebase]
NOTIFICATION_WEBHOOK_URL=[opcional: webhook de Discord/Slack]
PAYPAL_MODE=sandbox
PAYPAL_CURRENCY=MXN
PAYPAL_CLIENT_ID=[tu_paypal_sandbox_id]
PAYPAL_CLIENT_SECRET=[tu_paypal_secret]
FIREBASE_CONFIG_BASE64=[tu_config_base64]
```

## Paso 4: Obtener Credenciales

### 4.1 Firebase Admin Config (Base64)

**En tu máquina local:**

```bash
# Descargar el JSON de credenciales desde Firebase Console
# Project Settings → Service Accounts → Generate New Private Key

# Convertir a Base64
cat ruta/a/serviceAccountKey.json | base64

# En macOS
cat ruta/a/serviceAccountKey.json | base64 | pbcopy

# En Windows PowerShell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("ruta\a\serviceAccountKey.json")) | Set-Clipboard
```

Pega el resultado en `FIREBASE_CONFIG_BASE64` en Render.

### 4.2 Tu Admin UID

1. **Accede a `https://tropicana-xxxxx.onrender.com/admin`**
2. Haz clic en "Iniciar sesión administrativa"
3. Completa la autenticación de Google
4. Abre la consola del navegador (F12 → Console)
5. Ejecuta:
   ```javascript
   firebase.auth().currentUser.uid
   ```
6. Copia el UID y agréagalo a:
   - Render: `VITE_ADMIN_UID` y `ADMIN_UID`
   - Reinicia el servicio

## Paso 5: Verificar Deployment

### 5.1 Monitorear los logs

En el panel de Render:
1. Ve a tu servicio "tropicana"
2. Click en "Logs"
3. Espera a ver: `"Tropicana API listening on http://localhost:PORT"`

### 5.2 Pruebas básicas

```bash
# Verificar que el backend responde
curl https://tropicana-xxxxx.onrender.com/api/health

# Resultado esperado:
# {"status":"success","message":"El backend de Tropicana está vivo..."}
```

### 5.3 Verificar acceso de administración

1. Ve a `https://tropicana-xxxxx.onrender.com`
2. Haz clic en "Entrar" (esquina superior)
3. Auténticate con Google
4. Deberías ver un botón "Admin" en la navbar
5. Haz clic en "Admin"
6. Deberías ver el panel de administración

## Paso 6: Configurar Dominio Personalizado (Opcional)

1. En Render → Tu servicio → "Settings"
2. Scroll a "Custom Domain"
3. Agrega tu dominio (ej: `tropicana.com.mx`)
4. Configura los DNS según instrucciones de Render

## Paso 7: Monitoreo Continuo

### 7.1 Health Checks

Render verificará automáticamente:
- `GET /api/health` cada 30 segundos
- Si responde con 200, tu servicio está healthy

### 7.2 Auto-Restart en Caso de Error

Render reiniciará automáticamente el servicio si:
- El proceso se detiene
- No responde al health check
- Crash en tiempo de ejecución

### 7.3 Logs y Debugging

```bash
# Ver últimos logs
render logs tropicana

# Ver logs en tiempo real
render logs tropicana --tail

# Ver variables de entorno (confirmadas)
render env list tropicana
```

## Checklist Final

- [ ] ✅ Todas las variables de entorno están configuradas en Render
- [ ] ✅ El build completa exitosamente
- [ ] ✅ `/api/health` retorna status 200
- [ ] ✅ Puedo acceder a la página principal
- [ ] ✅ Puedo iniciar sesión con Google
- [ ] ✅ Mi Admin UID está configurado
- [ ] ✅ Puedo ver el botón "Admin" cuando estoy autenticado
- [ ] ✅ Puedo acceder al panel de administración en `/admin`
- [ ] ✅ Los productos se cargan correctamente
- [ ] ✅ El carrito funciona
- [ ] ✅ El checkout con PayPal funciona en sandbox

## 🆘 Troubleshooting

### "Build failed"

**Solución:**
```bash
# Verifica en local
npm run build

# Si falla, busca el error
# Típicamente: variables no definidas o imports incorrectos
```

### "Application crashed on startup"

**Verifica:**
```bash
# 1. Que el servidor inicia correctamente
npm start

# 2. Que todas las variables de entorno están en Render
# 3. Que FIREBASE_CONFIG_BASE64 es válido
```

### "Cannot find module 'vite'"

**Solución (ya aplicada):**
- `vite` debe estar en `dependencies`, no en `devDependencies`
- Verifica `package.json`

### "Admin panel no muestra después de login"

**Verifica:**
1. Tu `VITE_ADMIN_UID` es correcto
2. Coincide con tu Firebase UID
3. Ejecuta: `firebase.auth().currentUser.uid` en consola
4. Redeploy después de cambiar variables

---

## 📞 Soporte de Render

- Docs: https://render.com/docs
- Status: https://status.render.com
- Email: support@render.com
