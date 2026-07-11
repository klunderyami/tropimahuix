import { useEffect } from 'react';
import { subscribeToRealtimeKeepAlive } from '../supabase.js';

/**
 * Hook que mantiene viva la suscripcion a Realtime de Supabase.
 * 
 * Esto previene que el tenant se cierre por idle_shutdown cuando no hay
 * usuarios escuchando activamente el canal de Realtime.
 * 
 * Se debe montar al inicio de la aplicacion (ej. en App.tsx) y solo una vez.
 * 
 * PROPOSITO:
 * - Mantener una suscripcion persistente al canal 'admin-products-keep-alive'
 * - Escuchar cambios en la tabla 'products'
 * - Transmitir presencia para senializar actividad del tenant
 * - Prevenir que Supabase cierre la conexion por inactividad
 * 
 * COMPORTAMIENTO:
 * - Se monta una sola vez cuando el componente se monta
 * - Se desmonta al desmontar el componente (cleanup)
 * - Los logs en consola indican el estado de la conexion
 */
export function useRealtimeKeepAlive(): void {
  useEffect(() => {
    console.log('[useRealtimeKeepAlive] Montando suscripcion global de Realtime...');
    
    // Suscribir al canal de keep-alive
    const unsubscribe = subscribeToRealtimeKeepAlive();

    // Cleanup: desuscribirse al desmontar
    return () => {
      console.log('[useRealtimeKeepAlive] Desmontando suscripcion global de Realtime...');
      unsubscribe();
    };
  }, []); // Se ejecuta solo una vez al montar
}
