# Migración Firebase Auth → Supabase Auth (pendiente de validar antes de producción)

## Seguridad y datos
- Se conserva la base de datos existente: products, orders, gallery, chat_messages, distributors_leads, etc. No se borran datos.
- Aplicar `supabase/migrations/20261106_store_admins.sql` después de revisar la instancia y hacer copia de seguridad.
- En Supabase Dashboard → Authentication → Providers, habilitar Email y/o Google. Para Google, configurar credenciales OAuth del proveedor y URLs de retorno en Supabase (no usar las credenciales de Firebase).
- En Authentication → URL Configuration, registrar las URLs de Vercel y rutas de retorno: `/admin/dashboard`, `/admin/verify-link`, `/auth/magic-link`. Comprobar el redirect de Google y OTP.
- Crear o identificar un usuario **verificado** en Authentication → Users. Copiar su UUID (no la contraseña) y concederle acceso con una operación SQL autorizada: `INSERT INTO public.store_admins(user_id) VALUES ('UUID-DEL-USUARIO') ON CONFLICT DO NOTHING;`. No usar correos como prueba de administrador.
- La API verifica el JWT con Supabase y consulta `store_admins` en el servidor. El cliente nunca debe acceder a service_role.

## Variables Vercel
- Frontend Vite: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (valores del proyecto existente). No exponer claves secretas con prefijo `VITE_`.
- API Express: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (o `SUPABASE_SERVICE_KEY`).
- Mantener variables de PayPal y notificaciones sin cambios.
- Las variables sincronizadas por integración de Supabase no incluyen necesariamente los alias `VITE_` que Vite requiere; revisar la configuración antes del build.
- No eliminar Firebase del hosting actual ni desactivar cuentas hasta verificar la migración y conservar un respaldo.

## Pruebas obligatorias antes de fusionar
1. `npm ci && npm run build` y revisión de errores TypeScript.
2. Inicio de sesión Google, correo/contraseña y enlace mágico en preview.
3. Usuario sin rol admin: `GET /api/admin/me` debe responder 403 y las rutas administrativas deben rechazarlo.
4. Administrador verificado con fila en `store_admins`: debe entrar y gestionar catálogo, pedidos, medios, leads y chat.
5. Cliente autenticado: `GET /api/orders/mine` solo devuelve sus propios pedidos.
6. Catálogo, carrito, cálculo de stock, PayPal sandbox, captura y webhooks. No usar transacciones reales para probar.
7. Validar migraciones RLS existentes, especialmente las políticas sobre datos personales, antes de aplicar en producción.

**Importante:** Las cuentas de Firebase no se trasladan automáticamente a Supabase Auth. No se migran contraseñas. Los usuarios deberán registrarse o usar un método de acceso en Supabase. Este PR no modifica DNS ni despliega a producción.
