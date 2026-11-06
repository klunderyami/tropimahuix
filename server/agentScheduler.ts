import { createHash, timingSafeEqual } from 'node:crypto';
import type { Express, Request, Response, NextFunction } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runTropiAgent } from './agentService.js';

type JobId = 'facebook_ads' | 'customer_messages' | 'distributor_followup' | 'instagram_content' | 'sales_report';
interface Job { id: JobId; label: string; hour: number; weekdays: number[]; agentId: string; maxTargets: number; }
const JOBS: Job[] = [
  { id: 'facebook_ads', label: 'Publicidad de productos', hour: 9, weekdays: [0,1,2,3,4,5,6], agentId: 'AGT-ADS-CA', maxTargets: 0 },
  { id: 'customer_messages', label: 'Mensajes a clientes', hour: 10, weekdays: [0,1,2,3,4,5,6], agentId: 'AGT-NEG-WT', maxTargets: 10 },
  { id: 'distributor_followup', label: 'Seguimiento de distribuidores', hour: 12, weekdays: [0,1,2,3,4,5,6], agentId: 'AGT-NEG-CA', maxTargets: 0 },
  { id: 'instagram_content', label: 'Contenido para Instagram', hour: 15, weekdays: [1,3,5], agentId: 'AGT-SOC-IR', maxTargets: 0 },
  { id: 'sales_report', label: 'Análisis de ventas', hour: 18, weekdays: [1], agentId: 'AGT-ADS-AL', maxTargets: 0 },
];
const ZONE = 'America/Mexico_City';
function localParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23', minute: '2-digit', weekday: 'short',
  }).formatToParts(now);
  const value = (type: string) => parts.find(p => p.type === type)?.value || '';
  const weekday = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(value('weekday'));
  return { date: `${value('year')}-${value('month')}-${value('day')}`, hour: Number(value('hour')), minute: Number(value('minute')), weekday };
}
function safeSecret(a: string, b: string) {
  if (!a || !b) return false;
  const aa = createHash('sha256').update(a).digest();
  const bb = createHash('sha256').update(b).digest();
  return timingSafeEqual(aa, bb);
}
function adminId(req: Request) {
  return (req as Request & { auth?: { uid?: string } }).auth?.uid;
}

export function registerScheduledAgents(app: Express, db: SupabaseClient, requireAdmin: (req: any, res: Response, next: NextFunction) => unknown) {
  app.get('/api/admin/agent-schedules', requireAdmin, async (_req: Request, res: Response) => {
    const { data, error } = await db.from('agent_scheduled_runs')
      .select('id,job_id,local_date,status,agent_id,draft,target_limit,created_at,reviewed_at,error_message')
      .order('created_at', { ascending: false }).limit(100);
    if (error) return res.status(500).json({ error: 'No se pudo consultar el historial. ¿Se aplicó la migración SQL?' });
    return res.json({ timezone: ZONE, jobs: JOBS.map(({id,label,hour,weekdays,maxTargets})=>({id,label,hour,weekdays,maxTargets})), runs: data || [] });
  });

  app.post('/api/admin/agent-schedules/:id/review', requireAdmin, async (req: Request, res: Response) => {
    const id = req.params.id;
    const decision = req.body?.decision;
    const reviewer = adminId(req);
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id) || !['approved','rejected'].includes(decision) || !reviewer) {
      return res.status(400).json({ error: 'Revisión inválida.' });
    }
    const { data, error } = await db.from('agent_scheduled_runs')
      .update({ status: decision, reviewed_by: reviewer, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id).eq('status', 'pending_approval').select('id,status').maybeSingle();
    if (error) return res.status(500).json({ error: 'No se pudo registrar la revisión.' });
    if (!data) return res.status(409).json({ error: 'Este borrador ya fue revisado o no existe.' });
    return res.json({ ...data, published: false, sent: false });
  });

  // Called only by GitHub Actions with a private shared secret. No client or admin trigger.
  app.post('/api/internal/agent-schedule/:jobId', async (req: Request, res: Response) => {
    const key = process.env.AGENT_CRON_SECRET?.trim() || '';
    const supplied = req.header('authorization')?.replace(/^Bearer\s+/i, '') || '';
    if (!safeSecret(supplied, key)) return res.status(401).json({ error: 'No autorizado.' });
    const job = JOBS.find(j => j.id === req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Agente desconocido.' });
    const local = localParts();
    // Allow up to 59 minutes of scheduler delay, never run on the wrong day or hour.
    if (local.hour !== job.hour || !job.weekdays.includes(local.weekday)) {
      return res.status(409).json({ error: 'Fuera del horario programado.', timezone: ZONE });
    }
    const { data: run, error: claimError } = await db.from('agent_scheduled_runs')
      .insert({ job_id: job.id, local_date: local.date, agent_id: job.agentId, status: 'running', target_limit: job.maxTargets })
      .select('id').single();
    if (claimError) {
      if (claimError.code === '23505') return res.json({ alreadyScheduled: true });
      return res.status(500).json({ error: 'No se pudo reservar la ejecución. Verifica la migración SQL.' });
    }
    if (!run) return res.status(500).json({ error: 'No se pudo registrar la ejecución.' });
    try {
      let context = '';
      if (job.id === 'facebook_ads' || job.id === 'instagram_content') {
        const { data, error } = await db.from('products').select('name,description,price,category,stock,active')
          .or('active.eq.true,active.is.null').limit(20);
        if (error) throw error;
        context = 'Catálogo real, precios en MXN (verificar disponibilidad antes de publicar): ' + JSON.stringify(data || []);
      } else if (job.id === 'sales_report') {
        const { data, error } = await db.from('orders').select('total,status,created_at')
          .gte('created_at', new Date(Date.now() - 7*86400_000).toISOString()).limit(500);
        if (error) throw error;
        const orders = data || [];
        const paid = orders.filter(o => o.status === 'paid');
        context = JSON.stringify({ period: 'últimos 7 días', recordsAnalyzed: orders.length, paidOrders: paid.length, paidRevenueMXN: paid.reduce((sum,o)=>sum+Number(o.total||0),0), pendingOrders: orders.filter(o=>o.status==='pending').length, truncated: orders.length === 500 });
      } else if (job.id === 'distributor_followup') {
        const { data, error } = await db.from('distributors_leads').select('id,created_at').order('created_at',{ascending:false}).limit(100);
        if (error) throw error;
        context = JSON.stringify({ recentDistributorLeads: (data||[]).length, truncated: (data||[]).length===100 });
      } else {
        context = 'Crear UNA plantilla de mensaje comercial para un máximo de 10 clientes que hayan dado consentimiento verificable. No seleccionar destinatarios, no usar datos personales y no enviar mensajes. Requiere revisión humana y cumplimiento de políticas de WhatsApp/Meta para bebidas alcohólicas.';
      }
      const instruction = {
        facebook_ads: 'Propón una publicación orgánica y un borrador de anuncio para Facebook de bebidas alcohólicas artesanales, solo para audiencia adulta y revisión legal. No activar campañas ni asignar presupuesto. Usa únicamente los productos del catálogo.',
        customer_messages: 'Escribe una plantilla breve de seguimiento para clientes adultos con consentimiento; máximo 10 contactos al día. NO enviar, no inventar consentimiento ni destinatarios.',
        distributor_followup: 'Crea un plan de seguimiento y una plantilla para prospectos distribuidores, sin identificar ni contactar a personas automáticamente.',
        instagram_content: 'Crea una publicación de Instagram para revisión, con texto, idea visual y hashtags prudentes, dirigida solo a adultos. No publicar.',
        sales_report: 'Analiza las cifras agregadas de pedidos de los últimos 7 días; indica limitaciones y oportunidades, sin inventar cifras.',
      }[job.id];
      const output = await runTropiAgent(job.agentId, instruction + '\n\nDatos verificados disponibles:\n' + context);
      const { error: updateError } = await db.from('agent_scheduled_runs')
        .update({ draft: output, status: 'pending_approval', updated_at: new Date().toISOString() }).eq('id', run.id).eq('status','running');
      if (updateError) throw updateError;
      return res.json({ id: run.id, status: 'pending_approval', published: false, sent: false });
    } catch (err) {
      console.error('[Scheduled agent]', job.id, err instanceof Error ? err.message : 'unknown');
      await db.from('agent_scheduled_runs').update({ status:'failed', error_message:'Error al generar el borrador; consulta logs del servidor.', updated_at:new Date().toISOString() }).eq('id',run.id);
      return res.status(500).json({ error: 'No se pudo generar el borrador; revisa los logs.' });
    }
  });
}
