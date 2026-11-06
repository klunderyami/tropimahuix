import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response, Express } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

// Stripe Checkout hosted page: only server-side secrets, never trust browser totals.
const stripeApi = 'https://api.stripe.com/v1';
const mxnCents = (amount: number) => Math.round(amount * 100);
const stripeSecret = () => process.env.STRIPE_SECRET_KEY || '';
const webhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || '';
const siteOrigin = () => process.env.STRIPE_CHECKOUT_ORIGIN || process.env.CLIENT_ORIGIN || 'https://tropimahuix.vercel.app';

async function stripePost(path: string, params: URLSearchParams, idempotencyKey?: string) {
  const key = stripeSecret();
  if (!key) throw new Error('Stripe Checkout no está configurado.');
  const response = await fetch(stripeApi + path, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: params,
  });
  const result = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(result.error?.message || 'Stripe rechazó la solicitud.');
  return result;
}

function verifySignature(body: Buffer, header: string, secret: string) {
  const parts = header.split(',').map(v => v.trim());
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const signatures = parts.filter(p => p.startsWith('v1=')).map(p => p.slice(3));
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(timestamp + '.').update(body).digest();
  return signatures.some(signature => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const received = Buffer.from(signature, 'hex');
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

export function registerStripeRoutes(app: Express, db: SupabaseClient) {
  // Registered before express.json(), because Stripe signs the exact raw bytes.
  app.post('/api/stripe/webhook', async (req: Request, res: Response) => {
    const secret = webhookSecret();
    const signature = req.header('stripe-signature') || '';
    if (!secret || !Buffer.isBuffer(req.body) || !verifySignature(req.body, signature, secret)) {
      return res.status(400).json({ error: 'Firma Stripe inválida.' });
    }
    let event: { id: string; type: string; data: { object: Record<string, unknown> } };
    try { event = JSON.parse(req.body.toString('utf8')); }
    catch { return res.status(400).json({ error: 'Evento inválido.' }); }
    if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
      return res.json({ received: true });
    }
    const session = event.data.object;
    const sessionId = session.id;
    if (typeof sessionId !== 'string' || session.payment_status !== 'paid' || session.currency !== 'mxn') {
      return res.json({ received: true });
    }
    try {
      const { data: payment, error: lookupError } = await db.from('stripe_checkout_sessions')
        .select('order_id, amount_cents, status').eq('session_id', sessionId).single();
      if (lookupError || !payment) throw new Error('Sesión Stripe sin orden registrada.');
      if (session.client_reference_id !== payment.order_id || session.amount_total !== payment.amount_cents) {
        throw new Error('El monto o la referencia Stripe no coincide.');
      }
      const { data: order, error: orderError } = await db.from('orders').select('id,status,total').eq('id', payment.order_id).single();
      if (orderError || !order || mxnCents(Number(order.total)) !== payment.amount_cents) {
        throw new Error('Monto de orden no coincide.');
      }
      if (order.status === 'pending') {
        const { data: changed, error: updateError } = await db.from('orders')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', payment.order_id).eq('status', 'pending').select('id');
        if (updateError) throw updateError;
        if (!changed?.length) {
          const { data: latest } = await db.from('orders').select('status').eq('id', payment.order_id).single();
          if (latest?.status !== 'paid') throw new Error('No se pudo confirmar la orden.');
        }
      } else if (order.status !== 'paid') {
        throw new Error('La orden no admite confirmación automática.');
      }
      const { error: paymentError } = await db.from('stripe_checkout_sessions').update({ status: 'paid' }).eq('session_id', sessionId);
      if (paymentError) throw paymentError;
      return res.json({ received: true });
    } catch (error) {
      console.error('[Stripe webhook]', error);
      return res.status(500).json({ error: 'No se pudo procesar el evento; Stripe debe reintentar.' });
    }
  });

  app.post('/api/stripe/checkout', async (req: Request, res: Response) => {
    try {
      const orderId = req.body?.orderId;
      if (typeof orderId !== 'string' || !/^[0-9a-f-]{36}$/i.test(orderId)) {
        return res.status(400).json({ error: 'Identificador de orden inválido.' });
      }
      const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) return res.status(401).json({ error: 'Inicia sesión para pagar.' });
      const { data: auth, error: authError } = await db.auth.getUser(token);
      if (authError || !auth.user) return res.status(401).json({ error: 'Sesión no válida.' });
      const { data: order, error: orderError } = await db.from('orders')
        .select('id,user_id,total,status,items').eq('id', orderId).single();
      if (orderError || !order || order.user_id !== auth.user.id) return res.status(404).json({ error: 'Orden no encontrada.' });
      if (order.status !== 'pending') return res.status(409).json({ error: 'Esta orden no está pendiente de pago.' });
      const amount = mxnCents(Number(order.total));
      if (!Number.isSafeInteger(amount) || amount < 100) return res.status(400).json({ error: 'Importe inválido.' });
      const { data: existing } = await db.from('stripe_checkout_sessions').select('session_id,checkout_url,status').eq('order_id', orderId).maybeSingle();
      if (existing?.status === 'pending' && existing.checkout_url) return res.json({ url: existing.checkout_url });
      if (existing) return res.status(409).json({ error: 'La orden ya tiene una sesión de pago.' });

      const params = new URLSearchParams();
      params.set('mode', 'payment');
      params.set('client_reference_id', orderId);
      params.set('success_url', siteOrigin() + '/order-confirmation/' + encodeURIComponent(orderId) + '?stripe=success');
      params.set('cancel_url', siteOrigin() + '/checkout?stripe=cancel');
      params.set('line_items[0][price_data][currency]', 'mxn');
      params.set('line_items[0][price_data][unit_amount]', String(amount));
      params.set('line_items[0][price_data][product_data][name]', 'Pedido Tropicaña ' + orderId.slice(0, 8));
      params.set('line_items[0][quantity]', '1');
      params.set('metadata[order_id]', orderId);
      params.set('payment_method_types[0]', 'card');
      const session = await stripePost('/checkout/sessions', params, 'tropimahuix-mxn-' + orderId);
      if (!session.id || !session.url) throw new Error('Stripe no devolvió la página de pago.');
      const { error: saveError } = await db.from('stripe_checkout_sessions').insert({
        order_id: orderId, session_id: session.id, checkout_url: session.url, amount_cents: amount, status: 'pending',
      });
      if (saveError) throw saveError;
      return res.json({ url: session.url });
    } catch (error) {
      console.error('[Stripe checkout]', error);
      return res.status(500).json({ error: 'No fue posible iniciar el pago. Inténtalo de nuevo.' });
    }
  });

  app.get('/api/stripe/order-status/:orderId', async (req: Request, res: Response) => {
    const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Inicia sesión.' });
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return res.status(401).json({ error: 'Sesión inválida.' });
    const { data: order, error } = await db.from('orders').select('id,status').eq('id', req.params.orderId).eq('user_id', auth.user.id).maybeSingle();
    if (error || !order) return res.status(404).json({ error: 'Orden no encontrada.' });
    return res.json({ status: order.status });
  });
}
