-- ============================================================================
-- Tropicaña - Tabla de Leads de Distribuidores
-- Migración: 202607070002
-- Descripción: Tabla para capturar leads de nuevos distribuidores interesados
-- ============================================================================

-- 1. TABLA: distribuidores_leads
CREATE TABLE IF NOT EXISTS public.distribuidores_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo TEXT NOT NULL,
  nombre_negocio TEXT,
  telefono TEXT NOT NULL,
  email TEXT NOT NULL,
  estado TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  mensaje TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente',
  creado_el TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_distribuidores_leads_status ON public.distribuidores_leads (status);
CREATE INDEX IF NOT EXISTS idx_distribuidores_leads_creado_el ON public.distribuidores_leads (creado_el DESC);
CREATE INDEX IF NOT EXISTS idx_distribuidores_leads_email ON public.distribuidores_leads (email);

-- ============================================================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================================================

-- Habilitar RLS en la tabla
ALTER TABLE public.distribuidores_leads ENABLE ROW LEVEL SECURITY;

-- Lectura: solo service_role (backend Express) puede ver los leads
DROP POLICY IF EXISTS "distribuidores_leads_select_service" ON public.distribuidores_leads;
CREATE POLICY "distribuidores_leads_select_service" ON public.distribuidores_leads
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Inserción: service_role (backend Express) inserta leads desde el formulario
DROP POLICY IF EXISTS "distribuidores_leads_insert_service" ON public.distribuidores_leads;
CREATE POLICY "distribuidores_leads_insert_service" ON public.distribuidores_leads
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Actualización: solo service_role puede actualizar el status
DROP POLICY IF EXISTS "distribuidores_leads_update_service" ON public.distribuidores_leads;
CREATE POLICY "distribuidores_leads_update_service" ON public.distribuidores_leads
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PERMISOS PARA SERVICE_ROLE (Backend Express)
-- ============================================================================
-- El service_role necesita permisos completos para operar sin restricciones de RLS
GRANT ALL ON public.distribuidores_leads TO service_role;

-- ============================================================================
-- TRIGGER PARA ACTUALIZAR updated_at (si se agrega la columna en el futuro)
-- ============================================================================

-- Nota: Esta tabla no requiere updated_at por el momento, pero se puede agregar
-- si en el futuro se necesita rastrear modificaciones.