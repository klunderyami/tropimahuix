# Stripe Checkout (MXN) — Tropimahuix

**Estado:** preparado en rama para revisión. No habilitar cobros reales hasta completar la lista de activación.

## Activación

1. En la cuenta Stripe correspondiente al negocio, obtener `STRIPE_SECRET_KEY` (clave secreta de modo prueba primero). Guardarla **solo en Vercel**, nunca en `VITE_*`, GitHub o el navegador.
2. Ejecutar `supabase/migrations/20261106_stripe_checkout_sessions.sql` en el proyecto Supabase existente. La tabla privada registra las sesiones de Stripe sin modificar el esquema de pedidos existente.
3. En Stripe Developers → Webhooks, crear endpoint `https://tropimahuix.vercel.app/api/stripe/webhook` y suscribir `checkout.session.completed` y `checkout.session.async_payment_succeeded`. Guardar el signing secret como `STRIPE_WEBHOOK_SECRET` en Vercel. Las claves de test/live y sus secretos de webhook no son intercambiables.
4. Configurar `STRIPE_CHECKOUT_ORIGIN=https://tropimahuix.vercel.app` en Vercel (para previews, usar su URL de preview con el webhook de pruebas correspondiente). **Nunca** habilitar cobros live con una URL de retorno de preview.
5. Redeploy después de añadir variables. Probar con Stripe en modo prueba: autenticación, carrito, creación de orden, checkout, retorno, webhook, estado paid, inventario, duplicados y cancelación. Confirmar que un retorno sin webhook NO marca paid.
6. Después de validar, cambiar a claves live, actualizar webhook live y desplegar a producción. Desactivar PayPal solo al confirmar Stripe.

## Seguridad y comportamiento

- Importes y titular de pedido se comprueban en el servidor con la sesión Supabase.
- Stripe recibe **MXN** en centavos y una referencia a la orden.
- El webhook comprueba firma HMAC con tolerancia de cinco minutos, moneda, monto y referencia.
- El pago se registra solo cuando Stripe informa `payment_status=paid`; la página de retorno consulta el estado, no lo modifica.
- La tabla `stripe_checkout_sessions` está protegida con RLS y acceso de service role.
- Se reutiliza una sesión pendiente para no crear cobros duplicados al repetir clics.
- La reserva de inventario sigue ocurriendo en el RPC existente de creación de pedidos. **Pendiente de mejora:** vencimiento de sesiones y liberación automática de inventario tras cancelación o expiración. No asumir que una cancelación libera stock.
- El webhook no reemplaza el flujo histórico de PayPal para pedidos anteriores.
- No se han configurado claves reales, modificado datos ni realizado transacciones en Stripe desde esta rama.
