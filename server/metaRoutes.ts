import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import type { Express, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

// Meta signs deauthorization/data-deletion payloads using the app secret.
// Never accept an unsigned user_id as proof of a Meta request.
function verifySignedRequest(value: unknown): Record<string, unknown> | null {
  const secret = process.env.META_APP_SECRET;
  if (!secret || typeof value !== 'string' || value.length > 12000) return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  try {
    const [signature, payload] = parts;
    const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const actual = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const expected = createHmac('sha256', secret).update(payload).digest();
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const data = JSON.parse(decoded.toString('utf8')) as Record<string, unknown>;
    return data.algorithm === 'HMAC-SHA256' && typeof data.user_id === 'string' ? data : null;
  } catch { return null; }
}

function legalPage(res: Response): void {
  res.status(200).type('html').send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Eliminación de datos | Tropicaña</title></head><body style="font:16px system-ui;max-width:720px;margin:50px auto;padding:0 20px;line-height:1.6"><h1>Eliminación de datos de Meta</h1><p>Si conectaste Facebook o Instagram con Tropimahuix, puedes solicitar la desconexión y eliminación de los datos asociados a esa integración.</p><p>Escribe a <a href="mailto:tropicana1930@gmail.com">tropicana1930@gmail.com</a> con el asunto «Eliminación de datos de Meta». No incluyas contraseñas ni tokens. Verificaremos tu solicitud antes de eliminar los datos correspondientes.</p><p>También puedes retirar los permisos desde la configuración de aplicaciones y sitios web de Facebook o Instagram. La revocación puede generar una solicitud automática de eliminación a nuestro sistema.</p><p>La eliminación de los datos de la integración no implica eliminar pedidos u otros registros sujetos a obligaciones legales.</p><p><a href="/">Volver a Tropimahuix</a></p></body></html>`);
}

export function registerMetaRoutes(app: Express, supabase: SupabaseClient): void {
  app.get('/eliminar-datos', (_req, res) => legalPage(res));

  app.get('/api/auth/meta/callback', (_req: Request, res: Response) => {
    // Fail closed until OAuth state, account binding and encrypted token persistence are implemented.
    res.status(503).json({
      error: 'META_OAUTH_NOT_READY',
      message: 'La ruta existe, pero la autorización está deshabilitada hasta completar el almacenamiento seguro y la validación de estado OAuth.',
    });
  });

  const handleRevocation = async (req: Request, res: Response, deletion: boolean) => {
    const payload = verifySignedRequest(req.body?.signed_request);
    if (!payload) { res.status(403).json({ error: 'Invalid Meta signature' }); return; }
    const userId = payload.user_id as string;
    // Only revoke records matching the verified Meta user. Never return tokens.
    const { error } = await supabase.from('meta_connections')
      .delete().eq('meta_user_id', userId);
    if (error) {
      // Do not claim deletion succeeded if schema is absent or database failed.
      res.status(503).json({ error: 'Deletion could not be confirmed' });
      return;
    }
    if (deletion) {
      const confirmationCode = randomUUID();
      res.status(200).json({
        url: `https://tropimahuix.vercel.app/eliminar-datos?codigo=${encodeURIComponent(confirmationCode)}`,
        confirmation_code: confirmationCode,
      });
    } else {
      res.status(200).json({ success: true });
    }
  };

  app.post('/api/auth/meta/deauthorize', (req, res) => { void handleRevocation(req, res, false); });
  app.post('/api/auth/meta/data-deletion', (req, res) => { void handleRevocation(req, res, true); });
}
