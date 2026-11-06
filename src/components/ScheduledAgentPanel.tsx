import { useEffect, useState } from 'react';
import { auth } from '../firebase.js';

interface Job { id:string; label:string; hour:number; weekdays:number[]; maxTargets:number; }
interface Run { id:string; job_id:string; local_date:string; status:string; draft:string|null; target_limit:number; created_at:string; reviewed_at:string|null; error_message:string|null; }
const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
const DAYS = ['dom','lun','mar','mié','jue','vie','sáb'];
const STATUS:Record<string,string> = {
  running:'Generando',pending_approval:'Pendiente de aprobación',approved:'Aprobado (no publicado)',rejected:'Rechazado',failed:'Error',
};

export function ScheduledAgentPanel() {
  const [jobs,setJobs] = useState<Job[]>([]);
  const [runs,setRuns] = useState<Run[]>([]);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState('');
  const [timezone,setTimezone] = useState('America/Mexico_City');
  const refresh = async () => {
    const token = await auth.currentUser?.getIdToken();
    if(!token) throw new Error('Tu sesión expiró.');
    const response = await fetch(`${API_BASE}/api/admin/agent-schedules`,{headers:{Authorization:`Bearer ${token}`}});
    const data = await response.json() as {jobs?:Job[];runs?:Run[];timezone?:string;error?:string};
    if(!response.ok) throw new Error(data.error || 'No se pudo cargar el calendario.');
    setJobs(data.jobs || []);setRuns(data.runs || []);setTimezone(data.timezone || timezone);
  };
  useEffect(()=>{
    let active=true;
    void refresh().catch(err=>{if(active)setError(err instanceof Error?err.message:'Error de conexión');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[]);
  const review=async (id:string,decision:'approved'|'rejected')=>{
    if(busy) return;
    setBusy(id);setError('');
    try {
      const token=await auth.currentUser?.getIdToken();
      if(!token) throw new Error('Sesión expirada.');
      const response=await fetch(`${API_BASE}/api/admin/agent-schedules/${encodeURIComponent(id)}/review`,{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify({decision}),
      });
      const result=await response.json() as {error?:string};
      if(!response.ok)throw new Error(result.error||'No se pudo revisar.');
      await refresh();
    } catch(err){setError(err instanceof Error?err.message:'Error de revisión');}
    finally{setBusy('');}
  };
  return (
    <section className="mt-8 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-8" aria-label="Agentes programados">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#55744b]">Automatización en la nube</p>
        <h2 className="mt-2 text-2xl font-bold">Agentes programados y aprobaciones</h2>
        <p className="mt-2 text-sm text-stone-600">Zona horaria: {timezone}. Las tareas generan borradores: aprobar no publica anuncios ni envía mensajes. Las conexiones con Meta requieren una fase separada de autorización y pruebas.</p>
      </div>
      {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {loading?<p role="status">Cargando programación…</p>:<>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map(job=><div key={job.id} className="rounded-xl border border-[#e3e5d9] bg-[#f6f7ef] p-4">
            <p className="font-bold">{job.label}</p>
            <p className="mt-1 text-sm text-stone-600">{String(job.hour).padStart(2,'0')}:00 · {job.weekdays.length===7?'Todos los días':job.weekdays.map(d=>DAYS[d]).join(', ')}</p>
            {job.maxTargets>0&&<p className="mt-1 text-xs text-stone-600">Límite: {job.maxTargets} destinatarios potenciales; sin envío automático</p>}
          </div>)}
        </div>
        <div className="mt-7">
          <h3 className="text-lg font-bold">Borradores e historial</h3>
          {runs.length===0?<p className="mt-3 text-sm text-stone-600">Todavía no hay ejecuciones registradas. El programador comenzará después de configurar las claves privadas y aplicar la migración.</p>:
            <div className="mt-3 space-y-3">{runs.map(run=><article key={run.id} className="rounded-xl border border-stone-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{jobs.find(j=>j.id===run.job_id)?.label||run.job_id} · {run.local_date}</p>
                <span className="rounded-full bg-[#e9eee4] px-3 py-1 text-xs font-bold">{STATUS[run.status]||run.status}</span>
              </div>
              {run.draft&&<pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-stone-50 p-4 font-sans text-sm leading-relaxed">{run.draft}</pre>}
              {run.error_message&&<p className="mt-2 text-sm text-red-700">{run.error_message}</p>}
              {run.status==='pending_approval'&&<div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={busy===run.id} onClick={()=>void review(run.id,'approved')} className="rounded-full bg-[#23543c] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">Aprobar borrador</button>
                <button type="button" disabled={busy===run.id} onClick={()=>void review(run.id,'rejected')} className="rounded-full border border-stone-300 px-5 py-2 text-sm font-bold disabled:opacity-50">Rechazar</button>
              </div>}
            </article>)}</div>}
        </div>
      </>}
    </section>
  );
}
