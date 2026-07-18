-- ============================================================================
-- Tropicaña - Corrección de Permisos para Service Role
-- Migración: 202607070003
-- Descripción: Otorga permisos de lectura/escritura a service_role en tablas existentes
-- ============================================================================

-- ============================================================================
-- PERMISOS PARA SERVICE_ROLE (Backend Express)
-- ============================================================================
-- Permisos completos para el rol service_role (backend con service_role key)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_photos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distribuidores_leads TO service_role;

-- Permisos para secuencias (necesario para INSERT con DEFAULT gen_random_uuid())
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- PERMISOS PARA AUTHENTICATED (usuarios autenticados)
-- ============================================================================
-- Permisos de lectura para usuarios autenticados
GRANT SELECT ON public.products TO authenticated;
GRANT SELECT ON public.site_config TO authenticated;
GRANT SELECT ON public.gallery_photos TO authenticated;

-- ============================================================================
-- PERMISOS PARA ANON (usuarios anónimos/no autenticados)
-- ============================================================================
-- Permisos de lectura pública (alineados con las políticas RLS existentes)
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.site_config TO anon;
GRANT SELECT ON public.gallery_photos TO anon;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Permisos otorgados exitosamente a service_role';
END $$;