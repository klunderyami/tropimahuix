import { useEffect, useCallback, useState } from 'react';
import { trackVisit } from '../supabase';

const SESSION_KEY = 'tropicana_visited_session';

/**
 * Hook personalizado para rastrear visitas al sitio.
 * Utiliza sessionStorage para evitar duplicar visitas en refrescos inmediatos.
 */
export function useVisitTracker() {
  const track = useCallback(async () => {
    // Verificar si ya se registró una visita en esta sesión
    const hasVisited = sessionStorage.getItem(SESSION_KEY);
    
    if (!hasVisited) {
      try {
        // Registrar la visita en el backend
        const visitCount = await trackVisit();
        console.log(`[VisitTracker] Visita registrada. Total: ${visitCount}`);
        
        // Marcar la sesión como visitada
        sessionStorage.setItem(SESSION_KEY, 'true');
      } catch (error) {
        console.error('[VisitTracker] Error al registrar visita:', error);
      }
    } else {
      console.log('[VisitTracker] Visita ya registrada en esta sesión');
    }
  }, []);

  useEffect(() => {
    // Registrar visita al montar el componente
    track();
  }, [track]);
}

/**
 * Hook para obtener el contador de visitas actual.
 */
export function useVisitCount() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { getVisitCount } = await import('../supabase');
        const visitCount = await getVisitCount();
        setCount(visitCount);
      } catch (error) {
        console.error('[VisitCount] Error al obtener contador:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, []);

  return { count, loading };
}

