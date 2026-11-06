import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../firebase.js';
import { ScheduledAgentPanel } from '../components/ScheduledAgentPanel.js';

interface AgentSummary {
  id: string;
  name: string;
  module: string;
}

const GROUPS: Record<string, string> = {
  ALL: 'Todos',
  NEG: 'Negocio y ventas',
  SOC: 'Redes sociales',
  ADS: 'Publicidad',
  ENG: 'Ingeniería',
  CON: 'Contenido',
  SEO: 'SEO',
};
const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

export const AgentHub = () => {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [configured, setConfigured] = useState(false);
  const [group, setGroup] = useState('ALL');
  const [selectedId, setSelectedId] = useState('');
  const [instruction, setInstruction] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const selected = agents.find(agent => agent.id === selectedId);
  const filtered = useMemo(() => agents.filter(agent => group === 'ALL' || group === agent.module), [agents, group]);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Inicia sesión como administrador.');
        const response = await fetch(`${API_BASE}/api/admin/agents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json() as { configured?: boolean; agents?: AgentSummary[]; error?: string };
        if (!response.ok) throw new Error(data.error || 'No se pudo abrir el centro de agentes.');
        if (!live) return;
        setAgents(data.agents ?? []);
        setConfigured(Boolean(data.configured));
      } catch (err) {
        if (live) setError(err instanceof Error ? err.message : 'No fue posible consultar los agentes.');
      } finally { if (live) setLoading(false); }
    };
    void load();
    return () => { live = false; };
  }, []);

  const run = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId || !instruction.trim() || running) return;
    setRunning(true);
    setError('');
    setOutput('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Tu sesión expiró; vuelve a iniciar sesión.');
      const response = await fetch(`${API_BASE}/api/admin/agents/${encodeURIComponent(selectedId)}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ input: instruction.trim() }),
      });
      const data = await response.json() as { output?: string; error?: string };
      if (!response.ok) throw new Error(data.error || 'Error al ejecutar agente.');
      setOutput(data.output || 'No se recibió contenido.');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo generar la propuesta.'); }
    finally { setRunning(false); }
  };

  return (
    <main className="min-h-screen bg-[#f8f5ed] px-4 py-8 text-[#2c1d11] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-[2rem] bg-[#1b3b2b] px-7 py-8 text-white shadow-xl">
          <Link to="/admin" className="text-sm font-semibold text-amber-200 hover:underline">← Volver al panel de control</Link>
          <p className="mt-5 text-xs font-bold uppercase tracking-[.3em] text-[#d4a359]">Tropicaña · Gestión privada</p>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Centro de agentes</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80">
            Marketing, ventas, contenido, publicidad y SEO desde los 35 agentes originales de agentes_tropi.
            Las respuestas son borradores para revisar: no publican contenido ni contactan clientes automáticamente.
          </p>
        </div>

        {loading ? <p role="status" className="rounded-2xl bg-white p-6">Consultando agentes…</p> :
         error && agents.length === 0 ? <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">{error}</p> :
         <>
           {!configured && (
             <div role="status" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
               Los 35 agentes están incorporados, pero para ejecutarlos debes configurar <code className="font-bold">ANTHROPIC_API_KEY</code> en las variables privadas de Vercel. No escribas la clave aquí ni en GitHub.
             </div>
           )}
           <div className="mb-6 flex flex-wrap gap-2" aria-label="Filtrar agentes">
             {Object.entries(GROUPS).map(([id, label]) => (
               <button key={id} type="button" onClick={() => setGroup(id)}
                 className={`rounded-full px-4 py-2 text-sm font-semibold transition ${group === id ? 'bg-[#1b3b2b] text-white' : 'border border-[#d4a359]/30 bg-white hover:bg-[#e9eee4]'}`}>
                 {label}
               </button>
             ))}
           </div>
           <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
             <section aria-label="Seleccionar agente" className="max-h-[72vh] space-y-2 overflow-y-auto rounded-[1.5rem] border border-stone-200 bg-white/90 p-4 shadow-sm">
               <p className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-500">{filtered.length} agentes · Selecciona una especialidad</p>
               {filtered.map(agent => (
                 <button type="button" key={agent.id} onClick={() => { setSelectedId(agent.id); setOutput(''); setError(''); }}
                   className={`w-full rounded-xl border px-4 py-3 text-left transition ${selectedId === agent.id ? 'border-[#d4a359] bg-[#f5eddc] ring-1 ring-[#d4a359]' : 'border-stone-100 hover:border-[#d4a359] hover:bg-stone-50'}`}
                   aria-pressed={selectedId === agent.id}>
                   <span className="block font-bold">{agent.name}</span>
                   <span className="mt-1 block text-xs text-stone-500">{agent.id}</span>
                 </button>
               ))}
             </section>
             <section className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm">
               <h2 className="text-2xl font-bold">{selected?.name || 'Elige un agente'}</h2>
               <p className="mt-1 text-sm text-stone-500">Describe el trabajo específico y aporta datos verificados de la tienda.</p>
               <form onSubmit={run} className="mt-5 space-y-4">
                 <label htmlFor="agent-task" className="block text-sm font-bold">Instrucciones</label>
                 <textarea id="agent-task" value={instruction} onChange={e => setInstruction(e.target.value)}
                   maxLength={8000} rows={7} required
                   placeholder="Ej.: redacta una publicación para anunciar nuestros toritos artesanales en Xalapa. No inventes precios ni disponibilidad."
                   className="w-full resize-y rounded-2xl border border-stone-300 p-4 text-sm focus:border-[#d4a359] focus:outline-none focus:ring-2 focus:ring-[#d4a359]/30" />
                 <button type="submit" disabled={!configured || !selected || !instruction.trim() || running}
                   className="w-full rounded-full bg-[#1b3b2b] px-6 py-3 font-bold text-white transition hover:bg-[#2e5c42] disabled:cursor-not-allowed disabled:opacity-50">
                   {running ? 'Generando propuesta…' : 'Generar propuesta con IA'}
                 </button>
               </form>
               {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
               {output && (
                 <div className="mt-6 border-t border-stone-200 pt-5">
                   <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                     <h3 className="text-lg font-bold">Borrador generado</h3>
                     <button type="button" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50"
                       onClick={() => { void navigator.clipboard.writeText(output).catch(() => setError('No se pudo copiar. Selecciona el texto manualmente.')); }}>
                       Copiar texto
                     </button>
                   </div>
                   <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#f8f5ed] p-5 font-sans text-sm leading-relaxed">{output}</pre>
                 </div>
               )}
             </section>
           </div>
         </>}
        <ScheduledAgentPanel />
      </div>
    </main>
  );
};
